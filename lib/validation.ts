type ValidationError = {
    message?: unknown
}

type Translator = (key: any) => string

export function getValidationMessage(
    error: ValidationError | undefined,
    translators: {
        validation: Translator
        auth?: Translator
    }
): string | undefined {
    if (typeof error?.message !== 'string') {
        return undefined
    }

    const message = error.message

    if (message.startsWith('validation.')) {
        return translators.validation(
            message.replace('validation.', '')
        )
    }

    if (message.startsWith('auth.') && translators.auth) {
        return translators.auth(
            message.replace('auth.', '')
        )
    }

    return message
}