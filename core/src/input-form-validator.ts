import { isArray, keysOf } from './utils';

type FieldsOfType<FormValue, ValidFormValue extends FormValue, Type> = ({ [T in keyof FormValue]: ValidFormValue[T] extends Type ? T : never })[keyof FormValue];

/**
 * Interface representing a validation function for an input field.
 *
 * @template FormValue data of the form value
 * @template Field the name of the field this validator validates
 */
interface InputFieldValidator<FormValue, FieldValue, ValidFieldValue extends FieldValue> {

    /**
     * The error
     */
    readonly error: string,

    /**
     * The validation function
     *
     * @param {FormValue[Field]} value the value of the field
     * @returns {boolean} true, if the field is valid
     * @template FormValue, Field
     */
    readonly validate: (fieldValue: FieldValue, formValue: FormValue) => fieldValue is ValidFieldValue;
}

/**
 * A validator for an input form.
 *
 * @template FormValue data of the form value
 * @template Fields the validated fields of this validator
 * @template ValidatedFields the allowed field names, which can be validated by this input field validator
 */
export abstract class InputFormValidator<FormValue, ValidFormValue extends FormValue> {

    protected constructor() {
    }

    /**
     * Checks if a field of the input form value is valid.
     *
     * @param {Field} field the field name
     * @param {FormValue} value the form value
     * @returns {boolean} true if the input form value is valid
     * @template Field, FormValue
     */
    abstract isFieldValid<Field extends keyof FormValue>(field: Field, value: FormValue): value is FormValue & { [T in Field]: ValidFormValue[T] }

    /**
     * Getter for all validated field names
     *
     * @returns {Array<keyof ValidFormValue>} the field names
     * @template ValidFormValue
     */
    abstract getValidatedFields(): Array<keyof FormValue>;

    /**
     * Getter for the field errors
     *
     * @param {FormValue} value the form value
     * @returns {Partial<Record<keyof, ValidFormValue, string | undefined>>} the field errors
     * @template ValidFormValue, FormValue
     */
    abstract getFieldErrors(value: FormValue): Partial<Record<keyof FormValue, string | undefined>>;

    /**
     * Starts a conditional validator
     *
     * @param {(value: FormValue) => boolean} predicate
     * @param {(validator: ChildInputFormValidator<FormValue>) => ChildInputFormValidator<FormValue>} validatorBuilder the builder for the conditional validation
     * @returns {InputFormValidator<FormValue, ValidFormValue>}
     * @template FormValue, ValidFormValue, ConditionalFormValue, ConditionalValidFormValue
     */
    when<ConditionalValidFormValue extends ValidFormValue>(predicate: (value: FormValue) => boolean, validatorBuilder: (validator: InputFormValidator<FormValue, ValidFormValue>) => InputFormValidator<FormValue, ConditionalValidFormValue>): InputFormValidator<FormValue, ValidFormValue>;
    when<ConditionalFormValue extends FormValue, ConditionalValidFormValue extends ConditionalFormValue>(predicate: (value: FormValue) => value is ConditionalFormValue, validatorBuilder: (validator: InputFormValidator<ConditionalFormValue, ConditionalFormValue>) => InputFormValidator<ConditionalFormValue, ConditionalValidFormValue>): InputFormValidator<FormValue, ValidFormValue>;
    when<ConditionalFormValue extends FormValue, ConditionalValidFormValue extends ConditionalFormValue>(predicate: (value: FormValue) => value is ConditionalFormValue, validatorBuilder: (validator: InputFormValidator<ConditionalFormValue, ConditionalFormValue>) => InputFormValidator<ConditionalFormValue, ConditionalValidFormValue>): InputFormValidator<FormValue, ValidFormValue> {
        const subValidator = validatorBuilder(new NoopInputFormValidator());
        return new ConditionalInputFormValidator<FormValue, ValidFormValue, ConditionalFormValue, ConditionalValidFormValue>(predicate, subValidator, this);
    }

    /**
     * Appends an undefined validator without an error message
     *
     * undefined is considered invalid
     *
     * @param {Field} field the name of the field
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    notUndefinedWithNoError<Field extends keyof FormValue>(field: Field): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: Exclude<ValidFormValue[Field], undefined> }> {
        return this.notUndefined(field, '');
    }

    /**
     * Appends an undefined validator
     *
     * undefined is considered invalid
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is undefined
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    notUndefined<Field extends keyof FormValue>(field: Field, error: string): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: Exclude<ValidFormValue[Field], undefined> }> {
        return this.appendFieldValidator<Field, Exclude<ValidFormValue[Field], undefined>>(field, {
            error,
            validate: (fieldValue): fieldValue is Exclude<ValidFormValue[Field], undefined> => fieldValue !== undefined
        });
    }

    /**
     * Appends a not empty validator for an input field.
     * Note that, if the field data is not an array, then it is considered as invalid.
     *
     * undefined is considered invalid
     *
     * @param {Field} field the name of the field value
     * @param {string} error the error when the field value is empty
     * @returns {ChildInputFormValidator<FormValue, ValidFormValue, ValidatedFields>} the extended form validator
     * @template FormValue, Field, ValidFormValue, ValidatedFields
     */
    notEmpty<Field extends FieldsOfType<FormValue, ValidFormValue, unknown[]>>(field: Field, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendFieldValidator<Field, ValidFormValue[Field]>(field, {
            error,
            validate: (fieldValue): fieldValue is ValidFormValue[Field] => isArray(fieldValue) && fieldValue.length > 0
        });
    }

    /**
     * Appends a not blank validator for an input field.
     * Note that, if the field data is not a string, then it is considered as invalid.
     *
     * undefined is considered invalid.
     *
     * @param {Field} field the name of the field value
     * @param {string} error the error when the field value is empty
     * @returns {ChildInputFormValidator<FormValue, ValidFormValue, ValidatedFields>} the extended form validator
     * @template FormValue, Field, ValidFormValue, ValidatedFields
     */
    notBlank<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendStringValidator(field, error, str => str.trim() !== '');
    }

    /**
     * Appends a minimal length validator for an input field.
     * Note that, if the field data is not a string, then it is considered as invalid.
     *
     * undefined is considered invalid.
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value does not have the required length
     * @param {number} min the required minimal length of this field value
     * @returns {ChildInputFormValidator<FormValue, ValidFormValue, ValidatedFields>} the extended form validator
     * @template FormValue, Field, ValidFormValue, ValidatedFields
     */
    minLength<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, error: string, min: number): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendStringValidator(field, error, str => str.length >= min);
    }

    /**
     * Appends a maximal length validator for an input field.
     * Note that, if the field data is not a string, then it is considered as invalid.
     *
     * undefined is considered invalid.
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is longer than the maximal length
     * @param {number} max the maximal allowed length of this field value
     * @returns {ChildInputFormValidator<FormValue, ValidFormValue, ValidatedFields>} the extended form validator
     * @template FormValue, Field, ValidFormValue, ValidatedFields
     */
    maxLength<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, error: string, max: number): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendStringValidator(field, error, str => str.length <= max);
    }

    /**
     * Appends a length validator for an input field.
     * Note that, if the field data is not a string, then it is considered as invalid.
     *
     * undefined is considered invalid.
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is longer than the maximal length
     * @param {number} length the required length of this field value
     * @returns {ChildInputFormValidator<FormValue, ValidFormValue, ValidatedFields>} the extended form validator
     * @template FormValue, Field, ValidFormValue, ValidatedFields
     */
    hasLength<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, error: string, length: number): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendStringValidator(field, error, str => str.length === length);
    }

    /**
     * Appends a RegExp pattern validator for an input field.
     * Note that, if the field data is not a string, then it is considered as invalid.
     *
     * @param {Field} field the name of the field
     * @param {string | RegExp} pattern the pattern the match
     * @param {string} error the error when the field value does not match the pattern
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    pattern<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, pattern: string | RegExp, error: string): InputFormValidator<FormValue, ValidFormValue> {
        let regExp: RegExp;
        if (typeof pattern === 'string') {
            regExp = new RegExp(pattern);
        } else {
            regExp = pattern;
        }

        return this.appendStringValidator(field, error, value => regExp.test(value));
    }

    /**
     * Appends an email validator for an input field.
     * Note that if the field data is not a string, then it is considered as invalid.
     * Also note that this validator uses a rather basic Regex pattern for validation, it
     * might consider values as valid, which are not valid email addresses.
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is not a valid email
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    validMail<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.pattern(field, /[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}/, error);
    }

    /**
     * Appends a URL validator for an input field.
     * Note that, if the field data is not a string, then it is considered as invalid.
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is not a valid URL
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    validUrl<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendStringValidator(field, error, (str) => {
            try {
                const url = new URL(str);
                return url.protocol === 'http:' || url.protocol === 'https:';
            } catch (_) {
                return false;
            }
        });
    }

    /**
     * Appends a validator, which checks if the value of the form field is not equal to the given value
     *
     * @param {Field} field the name of the field
     * @param {*} invalidValue the value to compare to
     * @param {string} error the error when the field value is null
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    notEquals<Field extends keyof FormValue>(field: Field, invalidValue: unknown, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.require(field, error, value => value !== invalidValue);
    }

    /**
     * Appends a validator, which checks if the value of the form field is a positive, non-zero, number
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is zero or negative
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    isPositive<Field extends FieldsOfType<FormValue, ValidFormValue, number>>(field: Field, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.greaterThan(field, 0, error);
    }

    /**
     * Appends a validator, which checks if the value of the form field is greater than a specified value.
     *
     * @param {Field} field the name of the field
     * @param {number} min the minimal value for the field (exclusive)
     * @param {string} error the error when the field value is less than or equal to the minimal value
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    greaterThan<Field extends FieldsOfType<FormValue, ValidFormValue, number>>(field: Field, min: number, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendNumberValidator(field, error, num => num > min);
    }

    /**
     * Appends a validator, which checks if the value of the form field is an integer
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is not an integer
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    isInteger<Field extends FieldsOfType<FormValue, ValidFormValue, number>>(field: Field, error: string): InputFormValidator<FormValue, ValidFormValue> {
        return this.appendNumberValidator(field, error, num => num === Math.floor(num));
    }

    /**
     * Appends a generic input form field validator.
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is null
     * @param {Function<FormValue[Field], boolean>} validate the validation function for the input field value, returns true if the field value is valid
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    require<Field extends keyof FormValue>(field: Field, error: string, validate: (fieldValue: ValidFormValue[Field], formValue: FormValue) => boolean): InputFormValidator<FormValue, ValidFormValue>;
    require<Field extends keyof FormValue, ValidFieldValue extends ValidFormValue[Field]>(field: Field, error: string, validate: (fieldValue: ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidFieldValue): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidFieldValue }>;
    require<Field extends keyof FormValue, ValidFieldValue extends ValidFormValue[Field]>(field: Field, error: string, validate: (fieldValue: ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidFieldValue): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidFieldValue }> {
        return this.appendFieldValidator<Field, ValidFieldValue>(field, { error, validate });
    }

    /**
     * Appends a generic input form field validator which does not contain an error message.
     *
     * @param {Field} field the name of the field
     * @param {Function<FormValue[Field], boolean>} validate the validation function for the input field value, returns true if the field value is valid
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    requireWithNoError<Field extends keyof FormValue>(field: Field, validate: (fieldValue: ValidFormValue[Field], formValue: FormValue) => boolean): InputFormValidator<FormValue, ValidFormValue>
    requireWithNoError<Field extends keyof FormValue, ValidFieldValue extends ValidFormValue[Field]>(field: Field, validate: (fieldValue: ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidFieldValue): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidFieldValue }>
    requireWithNoError<Field extends keyof FormValue, ValidFieldValue extends ValidFormValue[Field]>(field: Field, validate: (fieldValue: ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidFieldValue): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidFieldValue }> {
        return this.appendFieldValidator<Field, ValidFieldValue>(field, {
            error: '',
            validate
        });
    }

    /**
     * Appends a validator for a string data field.
     * If the field value is not of data string, then the field is considered invalid.
     *
     * undefined is considered invalid
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is invalid
     * @param {(fieldValue: string, formValue: FormValue) => boolean} validate the validation function for the string value
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    appendStringValidator<Field extends FieldsOfType<FormValue, ValidFormValue, string>>(field: Field, error: string, validate: (fieldValue: string & ValidFormValue[Field], formValue: FormValue) => boolean): InputFormValidator<FormValue, ValidFormValue>;
    appendStringValidator<Field extends FieldsOfType<FormValue, ValidFormValue, string>, ValidString extends string & ValidFormValue[Field]>(field: Field, error: string, validate: (fieldValue: string & ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidString): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidString }>;
    appendStringValidator<Field extends FieldsOfType<FormValue, ValidFormValue, string>, ValidString extends string & ValidFormValue[Field]>(field: Field, error: string, validate: (fieldValue: string & ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidString): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidString }> {
        return this.appendFieldValidator<Field, ValidString>(field, {
            error,
            validate: (fieldValue, formValue): fieldValue is ValidString => typeof fieldValue === 'string' && validate(fieldValue, formValue)
        });
    }

    /**
     * Appends a validator for a number form field.
     * If the field value is not of data number, then the field is considered invalid.
     *
     * undefined is considered invalid
     *
     * @param {Field} field the name of the field
     * @param {string} error the error when the field value is invalid
     * @param {(fieldValue: number, formValue: FormValue) => boolean} validate the validation function for the number value
     * @returns {InputFormValidator<FormValue, ValidFormValue>} the extended form validator
     * @template FormValue, ValidFormValue, Field
     */
    appendNumberValidator<Field extends FieldsOfType<FormValue, ValidFormValue, number>>(field: Field, error: string, validate: (fieldValue: number & ValidFormValue[Field], formValue: FormValue) => boolean): InputFormValidator<FormValue, ValidFormValue>;
    appendNumberValidator<Field extends FieldsOfType<FormValue, ValidFormValue, number>, ValidNumber extends number & ValidFormValue[Field]>(field: Field, error: string, validate: (fieldValue: number & ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidNumber): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidNumber }>;
    appendNumberValidator<Field extends FieldsOfType<FormValue, ValidFormValue, number>, ValidNumber extends number & ValidFormValue[Field]>(field: Field, error: string, validate: (fieldValue: number & ValidFormValue[Field], formValue: FormValue) => fieldValue is ValidNumber): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidNumber }> {
        return this.appendFieldValidator<Field, ValidNumber>(field, {
            error,
            validate: (fieldValue, formValue): fieldValue is ValidNumber => typeof fieldValue === 'number' && validate(fieldValue, formValue)
        });
    }

    private appendFieldValidator<Field extends keyof FormValue, ValidFieldValue extends ValidFormValue[Field]>(field: Field, validator: InputFieldValidator<FormValue, ValidFormValue[Field], ValidFieldValue>): InputFormValidator<FormValue, ValidFormValue & { [_ in Field]: ValidFieldValue }> {
        return new ChildInputFormValidator<FormValue, ValidFormValue, Field, ValidFieldValue>(field, validator, this);
    }
}

/**
 * A simple no operation implementation of the {@link InputFormValidator}.
 * This validator will consider all form values as valid
 *
 * @template FormValue the type of the form value
 */
export class NoopInputFormValidator<FormValue> extends InputFormValidator<FormValue, FormValue> {

    /**
     * Default constructor
     */
    public constructor() {
        super();
    }

    /**
     * @inheritDoc
     */
    isFieldValid<Field extends keyof FormValue>(_field: Field, _value: FormValue): _value is FormValue {
        return true;
    }

    /**
     * @inheritDoc
     */
    getValidatedFields(): Array<keyof FormValue> {
        return [];
    }

    /**
     * @inheritDoc
     */
    getFieldErrors(): Partial<Record<keyof FormValue, string | undefined>> {
        return {};
    }
}

/**
 * An {@link InputFormValidator} implementation which consists if a parent validator and a field validation
 *
 * @template FormValue the type of the form value
 * @template ValidFormValue the type of the valid form value which is validated by the parent validator
 * @template ValidatedField the name of the field validated by this validator
 * @template ValidFieldValue the type of the field which is considered valid by the field validator
 */
class ChildInputFormValidator<FormValue, ValidFormValue extends FormValue, ValidatedField extends keyof FormValue, ValidFieldValue extends ValidFormValue[ValidatedField]>
    extends InputFormValidator<FormValue, ValidFormValue & { [T in ValidatedField]: ValidFieldValue }> {

    /**
     * Constructor for a new input form validator.
     *
     * @param {ValidatedField} validatedField the name of the field which is validated
     * @param {InputFieldValidator<FormValue, ValidFormValue[ValidatedField], ValidFieldValue>} validator the field validator
     * @param {InputFormValidator<FormValue, ValidFormValue>} parent the parent input form validator
     * @template FormValue, ValidFormValue, ValidatedField, ValidFieldValue
     */
    constructor(private readonly validatedField: ValidatedField,
                private readonly validator: InputFieldValidator<FormValue, ValidFormValue[ValidatedField], ValidFieldValue>,
                private readonly parent: InputFormValidator<FormValue, ValidFormValue>) {
        super();
    }

    /**
     * @inheritDoc
     */
    isFieldValid<Field extends keyof FormValue>(field: Field, value: FormValue): value is FormValue & { [T in Field]: (ValidFormValue & { [_ in ValidatedField]: ValidFieldValue })[T] } {
        if (!this.parent.isFieldValid(field, value)) {
            return false;
        }

        if (!this.isValidatedField(field)) {
            return true;
        }

        return this.validator.validate(value[field], value);
    }

    /**
     * @inheritDoc
     */
    getValidatedFields(): Array<keyof FormValue> {
        const validatedFields = this.parent.getValidatedFields();
        if (validatedFields.includes(this.validatedField)) {
            return validatedFields;
        } else {
            return [...validatedFields, this.validatedField];
        }
    }

    /**
     * @inheritDoc
     */
    getFieldErrors(value: FormValue): Partial<Record<keyof FormValue, string>> {
        const fieldErrors = this.parent.getFieldErrors(value);
        if (keysOf(fieldErrors).includes(this.validatedField)) {
            return fieldErrors;
        }

        const validatedValue = value as ValidFormValue;
        if (!this.validator.validate(validatedValue[this.validatedField], validatedValue)) {
            fieldErrors[this.validatedField] = this.validator.error;
        }

        return fieldErrors;
    }

    private isValidatedField(field: keyof ValidFormValue): field is ValidatedField {
        return this.validatedField === field;
    }
}

class ConditionalInputFormValidator<FormValue, ValidFormValue extends FormValue, ConditionalFormValue extends FormValue, ConditionalValidFormValue extends ConditionalFormValue> extends InputFormValidator<FormValue, ValidFormValue> {

    /**
     * Constructor for a new conditional input form validator.
     *
     * @param predicate the condition
     * @param conditionalValidator the conditional validator
     * @param parent the parent validator
     * @template FormValue, ValidFormValue, ValidatedField, ValidFieldValue
     */
    constructor(private readonly predicate: (value: FormValue) => value is ConditionalFormValue,
                private readonly conditionalValidator: InputFormValidator<ConditionalFormValue, ConditionalValidFormValue>,
                private readonly parent: InputFormValidator<FormValue, ValidFormValue>) {
        super();
    }

    /**
     * @inheritDoc
     */
    isFieldValid<Field extends keyof FormValue>(field: Field, value: FormValue): value is FormValue & { [T in Field]: ValidFormValue[T] } {
        if (!this.parent.isFieldValid(field, value)) {
            return false;
        }

        if (this.predicate(value)) {
            return this.conditionalValidator.isFieldValid(field, value);
        }

        return true;
    }

    /**
     * @inheritDoc
     */
    getValidatedFields(): Array<keyof FormValue> {
        const validatedFields = [...this.parent.getValidatedFields()];

        this.getConditionalValidatedFields().forEach((validatedField) => {
            if (!validatedFields.includes(validatedField)) {
                validatedFields.push(validatedField);
            }
        });

        return validatedFields;
    }

    /**
     * @inheritDoc
     */
    getFieldErrors(value: FormValue): Partial<Record<keyof FormValue, string | undefined>> {
        const fieldErrors = this.parent.getFieldErrors(value);
        const existingFieldsWithErrors = keysOf(fieldErrors);

        if (this.getConditionalValidatedFields().find(field => !existingFieldsWithErrors.includes(field)) === undefined || !this.predicate(value)) {
            return fieldErrors;
        }

        const conditionalFieldErrors = this.conditionalValidator.getFieldErrors(value);
        keysOf(conditionalFieldErrors)
            .map(field => field as keyof FormValue)
            .filter(field => !existingFieldsWithErrors.includes(field))
            .forEach(field => {
                fieldErrors[field] = conditionalFieldErrors[field];
            });

        return fieldErrors;
    }

    private getConditionalValidatedFields(): Array<keyof FormValue> {
        return this.conditionalValidator.getValidatedFields()
            .map(validatedField => validatedField as keyof FormValue);
    }
}
