import { EditorError } from './EditorError.js';

/** XML 1.0 character validity, shared by the SVG model and XML adapters. */
export class XmlValue {
  static validate(value: string): string {
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF\p{Surrogate}]/u.test(value)) {
      throw new EditorError('invalid XML character in document');
    }
    return value;
  }
}
