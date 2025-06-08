const sportsComplexController = require("../controller/sportscomplex-controller");
const {
    filterRequisitesSchema,
    filterPoolServicesSchema,
    filterBillsSchema,
    filterClientsSchema, 
    createServiceGroupSchema,
    getServiceGroupSchema,
    updateRequisiteSchema,
    updateServiceSchema,
    updateClientSchema, 
    updateBillSchema,
    createClientSchema, 
    createBillSchema,
    searchClientsSchema
} = require("../schema/sportscomplex-schema");

async function sportsComplexRoutes(fastify, options) {
    // Реквізити
    fastify.post("/filter-requisites", {
        schema: filterRequisitesSchema,
        handler: sportsComplexController.findRequisitesByFilter
    });

    fastify.post("/requisites", {
        handler: sportsComplexController.createRequisite
    });

    fastify.put("/requisites/:id", {
        schema: updateRequisiteSchema,
        handler: sportsComplexController.updateRequisite
    });

    fastify.get("/info/:id", sportsComplexController.getById);
    fastify.get("/generate/:id", sportsComplexController.generateWordById);
    fastify.get("/print/:id", sportsComplexController.printById);

    // Послуги
    fastify.post("/filter-pool", {
        schema: filterPoolServicesSchema,
        handler: sportsComplexController.findPoolServicesByFilter
    });

    fastify.post("/services", {
        handler: sportsComplexController.createPoolService
    });

    fastify.get("/service/:id", {
        handler: sportsComplexController.getServiceById
    });

    fastify.put("/services/:id", {
        schema: updateServiceSchema,
        handler: sportsComplexController.updateService
    });

    // Групи послуг
    fastify.post("/service-groups", {
        schema: createServiceGroupSchema,
        handler: sportsComplexController.createServiceGroup
    });
    
    fastify.get("/service-groups", {
        handler: sportsComplexController.getServiceGroups
    });
    
    fastify.get("/services-by-group/:id", {
        schema: getServiceGroupSchema,
        handler: sportsComplexController.getServicesByGroup
    });

    // Клієнти
    fastify.post("/clients/search", {
        schema: searchClientsSchema,
        handler: sportsComplexController.searchClients
    });

    // Рахунки
    fastify.post("/bills/filter", {
        schema: filterBillsSchema,
        handler: sportsComplexController.findBillsByFilter
    });

    fastify.post("/bills", {
        schema: createBillSchema,
        handler: sportsComplexController.createBill
    });

    fastify.get("/bills/:id", sportsComplexController.getBillById);

    fastify.put("/bills/:id", {
        schema: updateBillSchema,
        handler: sportsComplexController.updateBill
    });

    fastify.get("/bills/:id/download", sportsComplexController.downloadBill);

    // Клієнти
    fastify.post("/clients/filter", {
        schema: filterClientsSchema,
        handler: sportsComplexController.findClientsByFilter
    });

    fastify.post("/clients", {
        schema: createClientSchema,
        handler: sportsComplexController.createClient
    });

    fastify.get("/clients/:id", sportsComplexController.getClientById);

    fastify.put("/clients/:id", {
        schema: updateClientSchema,
        handler: sportsComplexController.updateClient
    });

    fastify.delete("/clients/:id", sportsComplexController.deleteClient);
}

module.exports = sportsComplexRoutes;