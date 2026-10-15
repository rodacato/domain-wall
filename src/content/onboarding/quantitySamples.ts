import type { ProgrammingLanguageId } from "../../domain/language/ProgrammingLanguage";

// Hand-written until the code generator produces the same value object from the pack.
export const QUANTITY_SAMPLES: Readonly<Record<ProgrammingLanguageId, string>> = {
  typescript: `type Quantity = number & { readonly brand: "Quantity" };

function createQuantity(
  value: number,
): Result<Quantity, QuantityError> {
  if (!Number.isInteger(value) || value < 1) {
    return err({ code: "QuantityMustBePositive" });
  }
  if (value > 99) return err({ code: "QuantityTooLarge" });
  return ok(value as Quantity);
}`,
  python: `@dataclass(frozen=True)
class Quantity:
    value: int

    @staticmethod
    def create(value: int) -> Result["Quantity", QuantityError]:
        if value < 1:
            return Err(QuantityError.MUST_BE_POSITIVE)
        if value > 99:
            return Err(QuantityError.TOO_LARGE)
        return Ok(Quantity(value))`,
  ruby: `Quantity = Struct.new(:value, keyword_init: true) do
  def self.create(value)
    return Failure(:quantity_must_be_positive) if value < 1
    return Failure(:quantity_too_large) if value > 99

    Success(new(value: value).freeze)
  end
end`,
  "ruby-dry": `Quantity = Types::Strict::Integer.constrained(gteq: 1, lteq: 99)

Quantity.try(2)   # => Success(2)
Quantity.try(0)   # => Failure(violates constraints)
Quantity.try(100) # => Failure(violates constraints)`,
};
