# Typed Input Forms

Typed input forms are utility classes and types to improve developer experience writing user input forms.
The core package contains the main types and classes whereas the other package provide framework specific extensions.

## Core

The main interface of the core is the ``InputFormState``, which represents the current state of an HTML form.
Basically the input form state assigns an HTML form a javascript object, where the keys of the object correspond to 
the input fields of the form and the values of the object to the current values of the input field.
In addition of storing the current value of the input fields, the form state knows about
- Validity of form fields and respective error messages
- Whether a field was touched the user, i.e. whether the value of a field was changed once
- Whether a field was changed compared to its initial value
- The input form state has a loading property, which can be used to indicate the user that the form is submitted.
- The input form state provides a reset function to set the value back to the initial value

However, the main advantage of this input form state is a typed-guided implementation, which allows a developer
to use auto-completion of his/her IDE, have error highlighting and typed validation on the input form.

Example:
```typescript
    type FormValue = {
        name: string;
        mail: string;
    }   

    const state: InputFormState<FormValue> = /* Get a form state implementation */;
```
In this case ``state.fields`` has exactly the two properties ``name`` and ``mail``.
If the type ``FormValue`` is changed (e.g. ``mail`` is renamed to ``email``), then the developer is directly informed
(if not automatically updated by the IDE) that the field of the form state have changed.

Furthermore, if one has an optional field, say ``demo``, in the type and a validator which requires that ``demo`` is not undefined,
then one can use the validated form value after checking validity of the form state to have correct type inference.
```typescript
    type FormValue = {
        /* ... */
        demo?: string;
    } 
    
    const validator = new NoopInputFormValidator<FormValue>().notUndefined(
        'demo' /* The field name, typed checked, i.e. only 'demo' | ... are allowed */
        'An error message'
    );

    // Usaually one the type is automatically infered.
    const state: InputFormState<FormValue, FormValue & {demo: string}> = /* Get a form state implementation with validator */;
    
    console.log(state.invalid) // true if state.value.demo is undefined or the form has any other validation error
    console.log(state.fields.demo.isInvalid()) // true if state.value.demo is undefined
    console.log(state.fields.demo.getErrorMessage()) // 'An error message' if state.value.demo is undefined

    const validValue = state.getValidValue(); // Throws an error if the state is invalid
    const str: string = validValue.demo; // This is valid typescript, as demo of valid Value has only type string not undefined.
```