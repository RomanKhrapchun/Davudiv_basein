const cnapController = require('../controller/cnap.controller')
const { 
    serviceFilterSchema, 
    serviceInfoSchema, 
    accountFilterSchema, 
    accountInfoSchema, 
    createServiceSchema, 
    updateServiceSchema,
    createAccountSchema 
} = require('../schema/cnap.schema')

const routes = async (fastify) => {
    // Get services list with filtering
    fastify.post('/services/filter', {
        schema: serviceFilterSchema,
        handler: cnapController.getServices
    })

    // Get service by ID
    fastify.get('/services/:id', {
        schema: serviceInfoSchema,
        handler: cnapController.getServiceById
    })

    // Create new service
    fastify.post('/services', {
        schema: createServiceSchema,
        handler: cnapController.createService
    })

    // Update service
    fastify.put('/services/:id', {
        schema: updateServiceSchema,
        handler: cnapController.updateService
    })

    // Delete service
    fastify.delete('/services/:id', {
        schema: serviceInfoSchema,
        handler: cnapController.deleteService
    })

    // Get accounts list with filtering
    fastify.post('/accounts/filter', {
        schema: accountFilterSchema,
        handler: cnapController.getAccounts
    })

    // Get account by ID
    fastify.get('/accounts/:id', {
        schema: accountInfoSchema,
        handler: cnapController.getAccountById
    })

    // Create new account
    fastify.post('/accounts', {
        schema: createAccountSchema,
        handler: cnapController.createAccount
    })
    fastify.get("/account/print/:id", { 
        schema: serviceInfoSchema,
        handler:cnapController.printDebtId
    })
}

module.exports = routes
