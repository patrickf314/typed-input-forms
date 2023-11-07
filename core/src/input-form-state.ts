import { type InputFormFields } from './input-form-field';

/**
 * Interface representing an input form state.
 *
 * @template ValidFormValue the type of validated form values
 * @template FormValue the type of allowed form values
 */
export interface InputFormState<FormValue, ValidFormValue = FormValue> {

    /**
     * The current value of the form field
     */
    readonly value: Readonly<FormValue>;

    /**
     * The fields contained in the form
     */
    readonly fields: InputFormFields<FormValue>;

    /**
     * false, if all form fields are valid
     */
    readonly invalid: boolean;

    /**
     * true if this form contains a field, which shows an error
     * @see InputFormField#isShowError
     */
    readonly showsAnyErrors: boolean;

    /**
     * true, if the form is untouched i.e. not field value was changed
     */
    readonly untouched: boolean;

    /**
     * true if the initial value equals the current value of the form
     */
    readonly unchanged: boolean;

    /**
     * true, if the form is currently loading
     */
    loading: boolean;

    /**
     * Resets the form
     */
    reset: () => void;

    /**
     * Marks all fields, which are validated by the form validator as touched
     */
    touchValidatedFields: () => void;

    /**
     * Getter for the validated form value, throws an error if the current form value is
     * not valid
     * @returns {Readonly<ValidFormValue>} the valid form value
     * @throws Error if the form value is not valid
     * @template ValidFormValue
     */
    getValidValue: () => Readonly<ValidFormValue>;
}