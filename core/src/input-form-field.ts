import { isPromise } from './utils';

/**
 * An interface representing a form field
 *
 * @template FieldValue the type of field values
 */
export interface InputFormField<FieldValue> {

    /**
     * Setter for the form field value
     *
     * @param {FieldValue} value the new value
     * @template FieldValue
     */
    setValue: (value: FieldValue) => void;

    /**
     * Getter for the form field value
     *
     * @returns {FieldValue} the current value
     * @template FieldValue
     */
    getValue: () => FieldValue | Promise<FieldValue>;

    /**
     * Marks the input field as touched
     */
    markAsTouched: () => void;

    /**
     * Checks if the field was touched, i.e. if the setValue was invoked once.
     *
     * @returns {boolean} true if the field is touched.
     */
    isTouched: () => boolean;

    /**
     * Checks if this input form field is invalid
     *
     * @returns {boolean} true if the field value is invalid
     */
    isInvalid: () => boolean;

    /**
     * Checks if this input form field is valid
     *
     * @returns {boolean} true if the field value is valid
     */
    isValid: () => boolean;

    /**
     * Checks if an error message for this input field should be rendered.
     * This function is equivalent of isTouched() && isInvalid().
     *
     * @returns {boolean} true if an error should be shown
     */
    isShowError: () => boolean;

    /**
     * Getter for the error of this input field validator
     *
     * @returns {string | undefined} the error of undefined if the field value is valid
     */
    getErrorMessage: () => string | undefined;

    /**
     * Mapping function of this input form field
     *
     * @param {(value: FieldValue) => (Promise<MappedValue> | MappedValue)} mapper the mapper
     * @param {(value: MappedValue) => FieldValue} inversMapper the invers mapper
     * @returns {InputFormField<MappedValue>} the mapped field
     * @template FieldValue, MappedValue
     */
    map: <MappedValue>(mapper: (value: FieldValue) => MappedValue | Promise<MappedValue>, inversMapper: (value: MappedValue) => FieldValue) => InputFormField<MappedValue>;
}

/**
 * A type representing the input form field for a given form value type
 * @template FormValue the form value type
 */
export type InputFormFields<FormValue> = { [Field in keyof FormValue]-?: InputFormField<FormValue[Field]> };

/**
 * Factory function for a new input form field handler
 *
 * @param {FormValue} formValue the current form value
 * @param {Function} setFormValue the form value setter
 * @param {Array<keyof FormValue>} touchedFields the list of touched field
 * @param {Function} setTouchedFields the setter for the touched field
 * @param {Partial<Record<keyof FormValue, string | undefined>>} errors the errors of the current form value
 * @template FormValue
 */
export function createInputFormFields<FormValue>(formValue: FormValue,
                                                 setFormValue: (updateFn: (prevState: FormValue) => FormValue) => void,
                                                 touchedFields: Array<keyof FormValue>,
                                                 setTouchedFields: (value: Array<keyof FormValue>) => void,
                                                 errors: Partial<Record<keyof FormValue, string | undefined>>): InputFormFields<FormValue> {
    return new Proxy<InputFormFields<FormValue>>(
        {} as unknown as InputFormFields<FormValue>,
        new InputFormFieldsHandler(formValue, setFormValue, touchedFields, setTouchedFields, errors)
    )
}

/**
 * A {@link ProxyHandler} implementation for the {@link InputFormFields} type
 *
 * @template FormValue the form value
 */
class InputFormFieldsHandler<FormValue> implements ProxyHandler<InputFormFields<FormValue>> {

    private readonly fields: Partial<InputFormFields<FormValue>> = {};

    /**
     * Constructor for a new input form field handler
     *
     * @param {FormValue} formValue the current form value
     * @param {Function} setFormValue the form value setter
     * @param {Array<keyof FormValue>} touchedFields the list of touched field
     * @param {Function} setTouchedFields the setter for the touched field
     * @param {Partial<Record<keyof FormValue, string | undefined>>} errors the errors of the current form value
     * @template FormValue
     */
    constructor(private readonly formValue: FormValue,
                private readonly setFormValue: (updateFn: (prevState: FormValue) => FormValue) => void,
                private readonly touchedFields: Array<keyof FormValue>,
                private readonly setTouchedFields: (value: Array<keyof FormValue>) => void,
                private readonly errors: Partial<Record<keyof FormValue, string | undefined>>) {
    }

    /**
     * @inheritDoc
     */
    get<Field extends keyof FormValue & string>(_target: InputFormFields<FormValue>, name: Field | symbol): InputFormField<FormValue[Field]> | undefined {
        if (typeof name !== 'string') {
            return undefined;
        }

        if (this.fields[name] === undefined) {
            this.fields[name] = {
                setValue: fieldValue => {
                    this.setFormValue(prevState => {
                        if (prevState[name] === fieldValue) {
                            return prevState;
                        }

                        const newValue = { ...prevState };
                        newValue[name] = fieldValue;
                        return newValue;
                    });
                    if (!this.touchedFields.includes(name)) {
                        this.setTouchedFields([...this.touchedFields, name]);
                    }
                },
                getValue: () => this.formValue[name],
                markAsTouched: () => {
                    if (!this.touchedFields.includes(name)) {
                        this.setTouchedFields([...this.touchedFields, name]);
                    }
                },
                isTouched: () => this.touchedFields.includes(name),
                isInvalid: () => this.errors[name] !== undefined,
                isValid: () => this.errors[name] === undefined,
                isShowError: () => this.touchedFields.includes(name) && this.errors[name] !== undefined,
                getErrorMessage: () => this.errors[name] === '' ? undefined : this.errors[name],
                map: (mapper, inversMapper) => {
                    const field = this.fields[name];
                    if (field === undefined) {
                        throw new Error('Failed to map form field ' + name);
                    }
                    return new MappedInputFormField(field, mapper, inversMapper);
                }
            } satisfies InputFormField<FormValue[Field]>;
        }

        return this.fields[name];
    }
}

class MappedInputFormField<FieldValue, MappedValue> implements InputFormField<MappedValue> {

    constructor(private readonly delegate: InputFormField<FieldValue>,
                private readonly mapper: (value: FieldValue) => MappedValue | Promise<MappedValue>,
                private readonly inverseMapper: (value: MappedValue) => FieldValue) {
    }

    getErrorMessage(): string | undefined {
        return this.delegate.getErrorMessage();
    }

    getValue(): MappedValue | Promise<MappedValue> {
        const value = this.delegate.getValue();
        if (isPromise(value)) {
            return value.then(this.mapper);
        }
        return this.mapper(value);
    }

    isInvalid(): boolean {
        return this.delegate.isInvalid();
    }

    isValid(): boolean {
        return this.delegate.isValid();
    }

    isShowError(): boolean {
        return this.delegate.isShowError();
    }

    isTouched(): boolean {
        return this.delegate.isTouched();
    }

    map<OtherMappedValue>(mapper: (value: MappedValue) => OtherMappedValue | Promise<OtherMappedValue>,
                          inversMapper: (value: OtherMappedValue) => MappedValue): InputFormField<OtherMappedValue> {
        return new MappedInputFormField(this, mapper, inversMapper);
    }

    markAsTouched(): void {
        this.delegate.markAsTouched();
    }

    setValue(value: MappedValue): void {
        this.delegate.setValue(this.inverseMapper(value));
    }
}
