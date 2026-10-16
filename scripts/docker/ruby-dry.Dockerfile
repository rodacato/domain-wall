FROM ruby:3.0.1-slim

RUN gem install --no-document \
    dry-types:1.7.2 \
    dry-struct:1.6.0 \
    dry-monads:1.6.0 \
    dry-validation:1.10.0
