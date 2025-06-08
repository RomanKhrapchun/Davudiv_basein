const serviceFilterSchema = {
    schema: {
        body: {
            type: 'object',
            properties: {
                page: { type: 'number', minimum: 1 },
                limit: { type: 'number', minimum: 1 },
                search: { type: 'string', nullable: true }
            }
        }
    }
}

const serviceInfoSchema = {
    schema: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'number' }
            }
        }
    }
}

const createServiceSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['identifier', 'name', 'price', 'edrpou', 'iban'],
            properties: {
                identifier: { type: 'string', minLength: 1, maxLength: 50 },
                name: { type: 'string', minLength: 1, maxLength: 255 },
                price: { type: 'string', pattern: '^[0-9]+(\\.[0-9]{1,2})?$' },
                edrpou: { type: 'string', pattern: '^\\d{8}$' },
                iban: { type: 'string', pattern: '^[A-Z]{2}[0-9]{27}$' }
            }
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    id: { type: 'number' },
                    identifier: { type: 'string' },
                    name: { type: 'string' }
                }
            }
        }
    }
}

const accountFilterSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['page', 'limit'],
            properties: {
                page: { type: 'number', minimum: 1 },
                limit: { type: 'number', minimum: 1 },
                search: { type: 'string' }
            }
        }
    }
}

const accountInfoSchema = {
    schema: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'number' }
            }
        }
    }
}

const updateServiceSchema = {
    schema: {
        params: {
            type: 'object',
            required: ['id'],
            properties: {
                id: { type: 'number' }
            }
        },
        body: {
            type: 'object',
            required: ['identifier', 'name', 'price', 'edrpou', 'iban'],
            properties: {
                identifier: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'string' },
                edrpou: { type: 'string', pattern: '^\\d{8}$' },
                iban: { type: 'string', pattern: '^[A-Z]{2}[0-9]{27}$' }
            }
        }
    }
}

const createAccountSchema = {
    schema: {
        body: {
            type: 'object',
            required: ['account_number', 'service_id', 'payer', 'amount', 'administrator'],
            properties: {
                account_number: { type: 'string', pattern: '^\\d{5}$' },
                service_id: { type: 'number' },
                payer: { type: 'string' },
                amount: { type: 'string' },
                administrator: { type: 'string' }
            }
        }
    }
}

module.exports = {
    serviceFilterSchema,
    serviceInfoSchema,
    accountFilterSchema,
    accountInfoSchema,
    createServiceSchema,
    updateServiceSchema,
    createAccountSchema
}
