// === src/Round/Domain/ValueObjects/RoundLetterVo.ts ===

// Covers all letters across all alphabet presets:
// EN: A-Z (incl. Q, V, X)
// PL_WITHOUT_DIACRITICS: subset of A-Z
// PL_WITH_DIACRITICS: A-Z + Ą Ć Ę Ł Ń Ó Ś Ź Ż
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

const VALID_LETTER_REGEX = /^[A-ZĄĆĘŁŃÓŚŹŻ]$/

export class RoundLetterVo {
  public constructor(public readonly value: string) {
    if (!VALID_LETTER_REGEX.test(value)) {
      throw new InvalidArgumentError(
        'RoundLetter must be a single uppercase letter from a supported alphabet preset.',
      )
    }
  }
}
