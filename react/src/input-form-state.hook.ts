import { useMemo, useRef, useState } from 'react';

/**
 * React hook for an input form state.
 *
 * @param {FormValue} _initialValue the initial value of the form
 * @returns {InputFormState<FormValue, FormValue>} the input form state
 * @template FormValue
 */
export function useInputFormState<FormValue>(_initialValue: FormValue): InputFormState<FormValue, FormValue>;
/**
 * React hook for an input form state.
 *
 * @param {FormValue} _initialValue the initial value of the form
 * @param {(require: ChildInputFormValidator<FormValue, FormValue>) => ChildInputFormValidator<FormValue, ValidFormValue>} validationBuilder a validation builder
 * @returns {InputFormState<FormValue, ValidFormValue>} the input form state
 * @template FormValue, ValidFormValue
 */
export function useInputFormState<FormValue, ValidFormValue extends FormValue = FormValue>(_initialValue: FormValue, validationBuilder: (require: InputFormValidator<FormValue, FormValue>) => InputFormValidator<FormValue, ValidFormValue>): InputFormState<FormValue, ValidFormValue>;
// export function useInputFormState<ValidFormValue, FormValue extends Partial<ValidFormValue>>(_initialValue: FormValue, validationBuilder: (require: InputFormValidator<FormValue, FormValue>) => InputFormValidator<FormValue, ValidFormValue>): InputFormState<FormValue, ValidFormValue>;
export function useInputFormState<FormValue, ValidFormValue extends FormValue>(_initialValue: FormValue, validationBuilder?: (require: InputFormValidator<FormValue, FormValue>) => InputFormValidator<FormValue, ValidFormValue>): InputFormState<FormValue, ValidFormValue> {
    const initialValue = useEquivalent(_initialValue);
    const emptyFieldsArray = useMemo(() => Array<keyof FormValue>(), []);

    const [value, setValue] = useState(initialValue);
    const [touchedFields, setTouchedFields] = useState(emptyFieldsArray);
    const [loading, setLoading] = useState(false);
    const validatedFieldsRef = useRef(emptyFieldsArray);

    const formValidator = useMemo(() => {
        const noopValidator = new NoopInputFormValidator<FormValue>();
        return validationBuilder !== undefined ? validationBuilder(noopValidator) : noopValidator;
    }, [validationBuilder]);

    const errors = useEquivalent(formValidator.getFieldErrors(value));

    const validatedFields = formValidator.getValidatedFields();
    if (!equals(validatedFieldsRef.current, validatedFields)) {
        validatedFieldsRef.current = validatedFields;
    }

    const fields = useMemo(() => new Proxy<InputFormFields<FormValue>>(
        {} as unknown as InputFormFields<FormValue>,
        new InputFormFieldsHandler(value, setValue, touchedFields, setTouchedFields, errors)
    ), [value, touchedFields, errors]);

    useMemo(() => {
        setValue(initialValue);
        setTouchedFields(emptyFieldsArray);
    }, [initialValue, emptyFieldsArray]);

    return useMemo(() => {
        const unChanged = equals(initialValue, value);
        return {
            fields,
            value,
            untouched: touchedFields.length === 0,
            get invalid() {
                return keysOf(errors).find(field => errors[field] !== undefined) !== undefined;
            },
            get showsAnyErrors() {
                return Stream.of(keysOf(errors)).anyMatch(field => errors[field] !== undefined && touchedFields.includes(field));
            },
            get loading() {
                return loading;
            },
            set loading(newValue: boolean) {
                setLoading(newValue);
            },
            unchanged: unChanged,
            reset: () => {
                setValue(initialValue);
                setTouchedFields([]);
            },

            touchValidatedFields: () => {
                const untouchedValidatedFields = validatedFieldsRef.current.filter(field => !touchedFields.includes(field));
                if (untouchedValidatedFields.length === 0) {
                    return;
                }

                setTouchedFields([
                    ...touchedFields,
                    ...untouchedValidatedFields
                ]);
            },

            getValidValue: (): Readonly<ValidFormValue> => {
                if (keysOf(errors).find(field => errors[field] !== undefined) === undefined) {
                    return value as unknown as ValidFormValue;
                } else {
                    throw new Error('Input form is not valid.');
                }
            }
        };
    }, [fields, value, touchedFields, initialValue, loading, errors]);
}

