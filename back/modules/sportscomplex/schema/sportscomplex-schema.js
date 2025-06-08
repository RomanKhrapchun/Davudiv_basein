// Схема для отримання інформації за ID
const requisiteInfoSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        },
    }
}

// Схема для фільтрації реквізитів
const filterRequisitesSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        kved: {
            type: 'string',
            optional: true,
        },
        iban: {
            type: 'string',
            optional: true,
        },
        edrpou: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для фільтрації послуг басейну
const filterPoolServicesSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        name: {
            type: 'string',
            optional: true,
        },
        lesson_count: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для створення послуги
const createServiceSchema = {
    body: {
        name: {
            type: 'string',
            min: 1,
        },
        lesson_count: {
            type: 'number',
            min: 1,
        },
        price: {
            type: 'number',
            min: 0,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// Схема для створення реквізитів
const createRequisiteSchema = {
    body: {
        kved: {
            type: 'string',
            min: 1,
        },
        iban: {
            type: 'string',
            min: 1,
        },
        edrpou: {
            type: 'string',
            min: 1,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// Схема для фільтрації рахунків
const filterBillsSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        client_name: {
            type: 'string',
            optional: true,
        },
        membership_number: {
            type: 'string',
            optional: true,
        },
        phone_number: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для створення рахунку
const createBillSchema = {
    body: {
        client_name: {
            type: 'string',
            min: 1,
        },
        membership_number: {
            type: 'string',
            min: 1,
        },
        phone_number: {
            type: 'string',
            min: 1,
        },
        service_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// Схема для редагування рахунку
const updateBillSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        client_name: {
            type: 'string',
            min: 1,
        },
        membership_number: {
            type: 'string',
            min: 1,
        },
        phone_number: {
            type: 'string',
            min: 1,
        },
        service_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// Схема для пошуку клієнтів
const searchClientsSchema = {
    body: {
        name: {
            type: 'string',
            min: 3,
        }
    }
}

// Схема для створення групи послуг
const createServiceGroupSchema = {
    body: {
        name: {
            type: 'string',
            minLength: 1,
        }
    }
}

// Схема для отримання групи послуг за ID
const getServiceGroupSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

// Схема для оновлення реквізитів
const updateRequisiteSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        kved: {
            type: 'string',
            min: 1,
        },
        iban: {
            type: 'string',
            min: 1,
        },
        edrpou: {
            type: 'string',
            min: 1,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

const updateServiceSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        name: {
            type: 'string',
            min: 1,
        },
        lesson_count: {
            type: 'number',
            minimum: 1,
        },
        price: {
            type: 'number',
            minimum: 0,
        },
        service_group_id: {
            type: 'number',
            numeric: true,
        }
    }
}

// Схема для фільтрації клієнтів - ЦЕ БУЛА ВІДСУТНЯ СХЕМА!
const filterClientsSchema = {
    body: {
        page: {
            type: 'number',
            optional: true,
        },
        limit: {
            type: 'number',
            optional: true,
        },
        name: {
            type: 'string',
            optional: true,
        },
        membership_number: {
            type: 'string',
            optional: true,
        },
        phone_number: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для створення клієнта
const createClientSchema = {
    body: {
        name: {
            type: 'string',
            min: 1,
        },
        membership_number: {
            type: 'string',
            min: 1,
        },
        phone_number: {
            type: 'string',
            min: 1,
        },
        subscription_duration: {
            type: 'string',
            min: 1,
        },
        service_name: {
            type: 'string',
            optional: true,
        }
    }
}

// Схема для редагування клієнта
const updateClientSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    },
    body: {
        name: {
            type: 'string',
            min: 1,
        },
        membership_number: {
            type: 'string',
            min: 1,
        },
        phone_number: {
            type: 'string',
            min: 1,
        },
        subscription_duration: {
            type: 'string',
            min: 1,
        },
        service_name: {
            type: 'string',
            optional: true,
        }
    }
}

// Нова схема для оновлення абонемента
const renewSubscriptionSchema = {
    params: {
        id: {
            type: 'string',
            numeric: true,
        }
    }
}

module.exports = {
    filterRequisitesSchema,
    filterPoolServicesSchema,
    requisiteInfoSchema,
    createServiceSchema,
    createRequisiteSchema,
    filterBillsSchema,
    createBillSchema,
    updateBillSchema,
    searchClientsSchema,
    createServiceGroupSchema,
    getServiceGroupSchema,
    updateRequisiteSchema,
    updateServiceSchema,
    filterClientsSchema,
    createClientSchema,
    updateClientSchema,
    renewSubscriptionSchema
}