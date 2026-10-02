# Can Dojo's Piston run Ruby with dry-rb?

Yes, without touching the Piston image. The gems are installed into the Ruby package directory on
Piston's persistent packages volume, and two lines are added to that package's `.env`.

## What was tested

The exact image Dojo pins in `config/deploy.api.yml`
(`ghcr.io/engineer-man/piston@sha256:2f66b745...`), run locally with `--privileged --cgroupns=host`
and a named volume on `/piston/packages`, which is how Dojo runs it. Ruby 3.0.1, Python 3.10.0 and
TypeScript 5.0.3 were installed through `POST /api/v2/packages`, as Dojo's
`scripts/piston-reprovision.sh` does. The image runs as linux/amd64 under emulation on an Apple
silicon laptop, so timings below are pessimistic.

## How Piston exposes a runtime (read from its source)

- A job runs in an `isolate` sandbox that mounts the runtime's package directory
  (`/piston/packages/<language>/<version>`) and `/etc`; nothing else of the image is visible.
- The job's environment is the `.env` file inside that package directory, read by
  `Runtime.env_vars` (`api/src/runtime.js`).
- Request bodies go through `body_parser.json()` with its default 100 KB limit, so dependencies
  cannot travel with the request.

## Provisioning that worked

After `POST /api/v2/packages {"language":"ruby","version":"3.0.1"}`:

```bash
cd /piston/packages/ruby/3.0.1
./bin/gem install -i ./gems dry-types dry-struct dry-monads dry-validation --no-document
cat >> .env <<'ENV'
GEM_HOME=/piston/packages/ruby/3.0.1/gems
GEM_PATH=/piston/packages/ruby/3.0.1/gems:/piston/packages/ruby/3.0.1/lib/ruby/gems/3.0.0
ENV
```

then restart the Piston process so the runtime re-reads `.env`.

- `GEM_PATH` must also list the stock gems directory. With only the new directory, Minitest (a
  bundled gem) stops loading.
- Result: 15 gems, 9.1 MB, 637 files on the packages volume. Resolved versions: dry-types 1.7.2,
  dry-struct 1.6.0, dry-monads 1.6.0, dry-validation 1.10.0, dry-core 1.0.2, dry-schema 1.13.4,
  dry-configurable 1.2.0, dry-logic 1.5.0, dry-inflector 1.1.0, dry-initializer 3.1.1,
  zeitwerk 2.6.18, concurrent-ruby 1.3.8, ice_nine 0.11.2, bigdecimal 3.3.1, logger 1.7.0.
  Dojo should pin these with `-v` instead of taking whatever is latest.
- A Dockerfile layer would not work: the volume mounted on `/piston/packages` hides anything the
  image puts there.

## Verified inside the sandbox, with Dojo's default limits

| Check                                                                                               | Result                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `Dry::Struct` aggregate returning `Dry::Monads` results, `new(to_h.merge(...))` with nested structs | passes, 284 ms                        |
| Minitest with one passing and one failing test                                                      | runs, prints the failure, exit code 1 |
| Ruby multi-file (`require_relative` into `lib/`)                                                    | works                                 |
| Python 3.10 `unittest`, frozen dataclass with `slots=True`                                          | works; failure gives exit code 1      |
| Python multi-file package (`ordering/__init__.py`)                                                  | works                                 |

## TypeScript in Piston has constraints that shape the generated code

Piston's TypeScript package renames every submitted file by appending `.ts`, compiles `*.ts` with
`tsc` and no config, then runs `node <entry>.js`:

- Files must be sent **without extension** (`main`, `lib`); `main.ts` becomes `main.ts.ts` and
  imports stop resolving.
- The default target library is ES5, so `Map`, `Object.entries` and `Array.prototype.includes` fail
  to type-check. Each generated file starts with `/// <reference lib="es2022" />`, which fixes it
  without a tsconfig.
- There are no Node type definitions: `process` must be declared locally
  (`declare const process: { exit(code: number): never }`).
- Compilation takes about 2.5 s even for tiny programs (Dojo's own notes say ~2.7 s).
- With those three adjustments a two-file program with classes, discriminated unions, `Map` and
  `process.exit` compiled and ran on Node 18.15.

## What Dojo would have to change

1. Add the gem installation and the two `.env` lines to `scripts/piston-reprovision.sh` (and the
   TypeScript runtime list it mirrors), right after the Ruby runtime is installed.
2. Restart Piston once after provisioning, using the existing accessory reboot.
3. Re-run it after a packages-volume reset, as the script already does for the runtimes.

No image change, no digest bump, no new network exposure.

## Open question for the host contract

Dojo's test harness prints `__DOJO_RESULT__ <json>`; this project planned its own JSON lines. The
`HostRunner` contract (phase 3) must decide who composes the harness and which output format is the
standard.
