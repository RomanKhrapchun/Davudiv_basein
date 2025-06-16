const { sqlRequest } = require("../../../helpers/database");
const logger = require("../../../utils/logger");
const { buildWhereCondition } = require("../../../utils/function");

class SportsComplexRepository {
    
    // ========================================
    // РЕКВІЗИТИ (REQUISITES)
    // ========================================
    
    async findRequisitesByFilter(limit, offset, displayFields, allowedFields) {
        try {
            let sql = `
                SELECT json_agg(rw) as data,
                max(cnt) as count
                FROM (
                    SELECT json_build_object(
                        'id', r.id,
                        'kved', r.kved,
                        'iban', r.iban,
                        'edrpou', r.edrpou,
                        'group_name', sg.name
                    ) as rw,
                    count(*) over() as cnt
                    FROM sport.requisites r
                    LEFT JOIN sport.service_groups sg ON r.service_group_id = sg.id
                    WHERE 1=1`;
            
            const values = [];
            let paramIndex = 1;
            
            for (const key in allowedFields) {
                sql += ` AND r.${key} ILIKE $${paramIndex}`;
                values.push(`%${allowedFields[key]}%`);
                paramIndex++;
            }
            
            sql += ` ORDER BY r.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex+1}) q`;
            values.push(limit, offset);
            
            const result = await sqlRequest(sql, values);
            return result;
        } catch (error) {
            logger.error("[SportsComplexRepository][findRequisitesByFilter]", error);
            throw error;
        }
    }

    async getById(id) {
        const sql = `SELECT * FROM sport.requisites WHERE id = $1`;
        try {
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[getById]", error);
            throw error;
        }
    }

    async getRequisite(id) {
        const sql = `
            SELECT r.*, sg.name AS group_name
            FROM sport.requisites r
            LEFT JOIN sport.service_groups sg ON sg.id = r.service_group_id
            WHERE r.id = $1
        `;
        try {
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[getRequisite]", error);
            throw error;
        }
    }

    async createRequisite(data) {
        const sql = `
            INSERT INTO sport.requisites 
            (kved, iban, edrpou, service_group_id) 
            VALUES ($1, $2, $3, $4)
            RETURNING id`;
        try {
            const result = await sqlRequest(sql, [data.kved, data.iban, data.edrpou, data.service_group_id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][createRequisite]", error);
            throw error;
        }
    }

    async updateRequisite(id, data) {
        try {
            const sql = `
                UPDATE sport.requisites
                SET 
                    kved = $1,
                    iban = $2,
                    edrpou = $3,
                    service_group_id = $4
                WHERE id = $5
                RETURNING id
            `;
            
            const result = await sqlRequest(sql, [
                data.kved,
                data.iban,
                data.edrpou,
                data.service_group_id,
                id
            ]);
            
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][updateRequisite]", error);
            throw error;
        }
    }

    // ========================================
    // ГРУПИ ПОСЛУГ (SERVICE GROUPS)
    // ========================================

    async getServiceGroups() {
        const sql = `SELECT id, name FROM sport.service_groups ORDER BY id`;
        try {
            return await sqlRequest(sql);
        } catch (error) {
            logger.error("[SportsComplexRepository][getServiceGroups]", error);
            throw error;
        }
    }

    async createServiceGroup(data) {
        const sql = `
            INSERT INTO sport.service_groups (name) 
            VALUES ($1)
            RETURNING id, name`;
        try {
            const result = await sqlRequest(sql, [data.name]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][createServiceGroup]", error);
            throw error;
        }
    }

    // ========================================
    // ПОСЛУГИ (SERVICES)
    // ========================================

    async findPoolServicesByFilter(limit, offset, displayFields, allowedFields) {
        try {
            let sql = `
                SELECT json_agg(rw) as data,
                COALESCE(max(cnt), 0) as count
                FROM (
                    SELECT json_build_object(
                        'id', s.id,
                        'name', s.name,
                        'lesson_count', s.lesson_count,
                        'price', s.price,
                        'service_group_id', s.service_group_id
                    ) as rw,
                    count(*) over() as cnt
                    FROM sport.services s
                    WHERE 1 = 1`;
            
            const values = [];
            let paramIndex = 1;
            
            for (const key in allowedFields) {
                if (key === 'lesson_count') {
                    sql += ` AND s.lesson_count = $${paramIndex}`;
                    values.push(parseInt(allowedFields[key]));
                } else {
                    sql += ` AND s.${key} ILIKE $${paramIndex}`;
                    values.push(`%${allowedFields[key]}%`);
                }
                paramIndex++;
            }
            
            sql += ` ORDER BY s.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex+1}) q`;
            values.push(limit, offset);
            
            return await sqlRequest(sql, values);
        } catch (error) {
            logger.error("[SportsComplexRepository][findPoolServicesByFilter]", error);
            throw error;
        }
    }

    async getServicesByGroup(groupId) {
        try {
            const parsedId = parseInt(groupId, 10);
            if (isNaN(parsedId)) {
                console.error(`Invalid group ID: ${groupId}`);
                return [];
            }
            
            const sql = `
                SELECT 
                    id, 
                    name, 
                    lesson_count, 
                    price, 
                    service_group_id
                FROM sport.services
                WHERE service_group_id = $1
                ORDER BY name
            `;
            
            const result = await sqlRequest(sql, [parsedId]);
            
            return result.map(service => ({
                id: service.id,
                name: service.name,
                lesson_count: service.lesson_count,
                price: service.price,
                service_group_id: service.service_group_id
            }));
        } catch (error) {
            logger.error("[SportsComplexRepository][getServicesByGroup]", error);
            return [];
        }
    }

    async createPoolService(data) {
        const sql = `
            INSERT INTO sport.services 
            (name, lesson_count, price, service_group_id) 
            VALUES ($1, $2, $3, $4)
            RETURNING id`;
        try {
            const result = await sqlRequest(sql, [data.name, data.lesson_count, data.price, data.service_group_id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][createPoolService]", error);
            throw error;
        }
    }

    async getServiceById(id) {
        try {
            const sql = `
                SELECT s.*, sg.name AS group_name
                FROM sport.services s
                LEFT JOIN sport.service_groups sg ON s.service_group_id = sg.id
                WHERE s.id = $1
            `;
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][getServiceById]", error);
            throw error;
        }
    }

    async updateService(id, data) {
        try {
            const sql = `
                UPDATE sport.services
                SET 
                    name = $1,
                    lesson_count = $2,
                    price = $3,
                    service_group_id = $4
                WHERE id = $5
                RETURNING id
            `;
            
            const result = await sqlRequest(sql, [
                data.name,
                data.lesson_count,
                data.price,
                data.service_group_id,
                id
            ]);
            
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][updateService]", error);
            throw error;
        }
    }

    // ========================================
    // КЛІЄНТИ (CLIENTS)
    // ========================================

    async searchClientsByName(name) {
        const sql = `
            SELECT name, phone_number, membership_number
            FROM sport.clients
            WHERE name ILIKE $1
            ORDER BY name
            LIMIT 10
        `;
        try {
            return await sqlRequest(sql, [`%${name}%`]);
        } catch (error) {
            logger.error("[SportsComplexRepository][searchClientsByName]", error);
            return [];
        }
    }

    async searchClientByMembership(membershipNumber) {
        const sql = `
            SELECT name, phone_number, membership_number
            FROM sport.clients
            WHERE membership_number = $1
            LIMIT 1
        `;
        try {
            const result = await sqlRequest(sql, [membershipNumber]);
            return result[0] || null;
        } catch (error) {
            logger.error("[SportsComplexRepository][searchClientByMembership]", error);
            return null;
        }
    }

    async findClientsByFilter(limit, offset, displayClientsFilterFields, allowedFields) {
        try {
            let sql = `SELECT json_agg(rw) as data,
                    COALESCE(max(cnt), 0) as count
                    FROM (
                    SELECT json_build_object(
                        'id', c.id,
                        'name', c.name,
                        'membership_number', c.membership_number,
                        'phone_number', c.phone_number,
                        'current_service_name', COALESCE(c.current_service_name, 'Немає активної послуги'),
                        'remaining_visits', COALESCE(c.remaining_visits, 0),
                        'subscription_duration', c.subscription_duration,
                        'subscription_days_left', COALESCE(c.subscription_days_left, 30),
                        'subscription_active', COALESCE(c.subscription_active, true),
                        'subscription_start_date', c.subscription_start_date,
                        'subscription_end_date', c.subscription_end_date,
                        'created_at', c.created_at
                    ) as rw,
                    count(*) over() as cnt
                    FROM sport.clients c
                    WHERE 1=1`;
            
            const values = [];
            let paramIndex = 1;
            
            for (const key in allowedFields) {
                sql += ` AND c.${key} ILIKE $${paramIndex}`;
                values.push(`%${allowedFields[key]}%`);
                paramIndex++;
            }
            
            sql += ` ORDER BY c.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex+1}) q`;
            values.push(limit, offset);
            
            return await sqlRequest(sql, values);
        } catch (error) {
            logger.error("[SportsComplexRepository][findClientsByFilter]", error);
            throw error;
        }
    }

    async createClient(data) {
        try {
            const sql = `
                INSERT INTO sport.clients
                (name, membership_number, phone_number, subscription_duration, 
                subscription_start_date, subscription_end_date, 
                subscription_days_left, subscription_active, visit_count,
                current_service_name, remaining_visits, created_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 
                        CURRENT_TIMESTAMP + INTERVAL '30 days', 30, true, 0,
                        'Немає активної послуги', 0, CURRENT_TIMESTAMP)
                RETURNING id`;
                
            const result = await sqlRequest(sql, [
                data.name,
                data.membership_number,
                data.phone_number,
                '30 днів' // Фіксована тривалість
            ]);
            
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][createClient]", error);
            throw error;
        }
    }

    async updateClient(id, data) {
        try {
            const sql = `
                UPDATE sport.clients
                SET name = $1, membership_number = $2, phone_number = $3, 
                    subscription_duration = $4, service_name = $5, updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING id
            `;
            
            const result = await sqlRequest(sql, [
                data.name,
                data.membership_number,
                data.phone_number,
                data.subscription_duration,
                data.service_name || 'Загальний доступ',
                id
            ]);
            
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][updateClient]", error);
            throw error;
        }
    }

    async getClientById(id) {
        try {
            const sql = `
                SELECT id, name, membership_number, phone_number, subscription_duration,
                    service_name, visit_count, subscription_days_left, subscription_active,
                    subscription_start_date, subscription_end_date, created_at, updated_at
                FROM sport.clients
                WHERE id = $1
            `;
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][getClientById]", error);
            throw error;
        }
    }

    async renewClientSubscription(id) {
        try {
            const sql = `
                UPDATE sport.clients
                SET subscription_days_left = 30,
                    subscription_active = true,
                    subscription_start_date = CURRENT_TIMESTAMP,
                    subscription_end_date = CURRENT_TIMESTAMP + INTERVAL '30 days'
                WHERE id = $1
                RETURNING id
            `;
            const result = await sqlRequest(sql, [id]);
            return result.length > 0;
        } catch (error) {
            logger.error("[SportsComplexRepository][renewClientSubscription]", error);
            throw error;
        }
    }

    async incrementVisitCount(id) {
        try {
            const sql = `
                UPDATE sport.clients
                SET visit_count = visit_count + 1
                WHERE id = $1
                RETURNING visit_count
            `;
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][incrementVisitCount]", error);
            throw error;
        }
    }

    async deleteClient(id) {
        try {
            const sql = `DELETE FROM sport.clients WHERE id = $1 RETURNING id`;
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][deleteClient]", error);
            throw error;
        }
    }

    async startLesson(clientId) {
        try {
            // Перевіряємо поточну кількість відвідувань
            const checkSql = `
                SELECT remaining_visits, current_service_name 
                FROM sport.clients 
                WHERE id = $1
            `;
            const clientData = await sqlRequest(checkSql, [clientId]);
            
            if (!clientData.length) {
                return { success: false, message: 'Клієнта не знайдено' };
            }
            
            const remainingVisits = clientData[0].remaining_visits || 0;
            
            if (remainingVisits <= 0) {
                return { 
                    success: false, 
                    message: 'Кількість занять використана, будь ласка оновіть абонемент.' 
                };
            }
            
            // Зменшуємо кількість відвідувань на 1
            const updateSql = `
                UPDATE sport.clients
                SET remaining_visits = remaining_visits - 1
                WHERE id = $1
                RETURNING remaining_visits
            `;
            
            const result = await sqlRequest(updateSql, [clientId]);
            
            return { 
                success: true, 
                message: 'Заняття успішно розпочато',
                remaining_visits: result[0].remaining_visits
            };
        } catch (error) {
            logger.error("[SportsComplexRepository][startLesson]", error);
            throw error;
        }
    }

    // ========================================
    // ГЕНЕРАЦІЯ УНІКАЛЬНИХ НОМЕРІВ
    // ========================================

    async generateUniqueClientNumber() {
        try {
            let membershipNumber;
            let isUnique = false;
            let attempts = 0;
            const maxAttempts = 50;
            
            while (!isUnique && attempts < maxAttempts) {
                const now = new Date();
                const year = now.getFullYear().toString().slice(-2);
                const month = (now.getMonth() + 1).toString().padStart(2, '0');
                const day = now.getDate().toString().padStart(2, '0');
                const hours = now.getHours().toString().padStart(2, '0');
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const random = Math.floor(100 + Math.random() * 900);
                
                membershipNumber = `${year}${month}${day}${hours}${minutes}${random}`;
                
                const checkSql = `SELECT COUNT(*) as count FROM sport.clients WHERE membership_number = $1`;
                const result = await sqlRequest(checkSql, [membershipNumber]);
                
                isUnique = parseInt(result[0].count) === 0;
                attempts++;
                
                if (!isUnique) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
            
            if (!isUnique) {
                throw new Error('Не вдалося згенерувати унікальний номер абонемента після максимальної кількості спроб');
            }
            
            return membershipNumber;
        } catch (error) {
            logger.error("[SportsComplexRepository][generateUniqueClientNumber]", error);
            throw error;
        }
    }

    async checkMembershipUnique(membershipNumber) {
        try {
            const checkSql = `SELECT COUNT(*) as count FROM sport.clients WHERE membership_number = $1`;
            const result = await sqlRequest(checkSql, [membershipNumber]);
            return parseInt(result[0].count) === 0;
        } catch (error) {
            logger.error("[SportsComplexRepository][checkMembershipUnique]", error);
            throw error;
        }
    }

    // ========================================
    // РАХУНКИ (BILLS/PAYMENTS) - БАЗОВІ МЕТОДИ
    // ========================================

    async createBill(request) {
        try {
            const {
                client_name,
                membership_number,
                phone_number,
                service_id,
                visit_count,
                total_price
            } = request.body;

            const sql = `
                INSERT INTO sport.payments (
                    client_name, 
                    membership_number, 
                    phone_number, 
                    service_id, 
                    visit_count, 
                    total_price,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
                RETURNING *`;

            const result = await sqlRequest(sql, [
                client_name,
                membership_number,
                phone_number,
                service_id,
                visit_count,
                total_price
            ]);

            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][createBill]", error);
            throw error;
        }
    }

    async updateBill(id, data) {
        try {
            // Отримуємо інформацію про послугу
            const serviceInfo = await sqlRequest(
                `SELECT id, name, price, lesson_count FROM sport.services WHERE id = $1`,
                [data.service_id]
            );
            
            if (!serviceInfo || !serviceInfo.length) {
                throw new Error('Послугу не знайдено');
            }
            
            const service = serviceInfo[0];
            
            const sql = `
                UPDATE sport.payments
                SET client_name = $1, membership_number = $2, phone_number = $3, 
                    service_id = $4, visit_count = $5, total_price = $6
                WHERE id = $7
                RETURNING id
            `;
            
            const result = await sqlRequest(sql, [
                data.client_name,
                data.membership_number,
                data.phone_number,
                data.service_id,
                service.lesson_count,
                service.price,
                id
            ]);
            
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][updateBill]", error);
            throw error;
        }
    }

// ✅ ВИПРАВЛЕНИЙ findBillsByFilter в repository
async findBillsByFilter(limit, offset, displayFields, allowedFields) {
    try {
        let sql = `
            SELECT json_agg(rw) as data,
            COALESCE(max(cnt), 0) as count
            FROM (
                SELECT json_build_object(
                    'id', p.id,
                    'client_name', p.client_name,
                    'membership_number', p.membership_number,
                    'phone_number', p.phone_number,
                    'service_group', sg.name,
                    'service_name', s.name,
                    'visit_count', p.visit_count,
                    'total_price', p.total_price,
                    'created_at', p.created_at
                ) as rw,
                count(*) over() as cnt
                FROM sport.payments p
                LEFT JOIN sport.services s ON p.service_id = s.id
                LEFT JOIN sport.service_groups sg ON s.service_group_id = sg.id
                WHERE 1=1`;
        
        const values = [];
        let paramIndex = 1;
        
        for (const key in allowedFields) {
            sql += ` AND p.${key} ILIKE $${paramIndex}`;
            values.push(`%${allowedFields[key]}%`);
            paramIndex++;
        }
        
        sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex+1}) q`;
        values.push(limit, offset);
        
        return await sqlRequest(sql, values);
    } catch (error) {
        logger.error("[SportsComplexRepository][findBillsByFilter]", error);
        throw error;
    }
}

    async getBillById(id) {
        try {
            const sql = `
                SELECT 
                    p.id,
                    p.client_name,
                    p.membership_number,
                    p.phone_number,
                    p.visit_count,
                    p.total_price,
                    p.service_id,
                    p.created_at,
                    s.name as service_name,
                    sg.name as service_group
                FROM sport.payments p
                LEFT JOIN sport.services s ON p.service_id = s.id
                LEFT JOIN sport.service_groups sg ON s.service_group_id = sg.id
                WHERE p.id = $1`;
            
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][getBillById]", error);
            throw error;
        }
    }

    // ========================================
    // РАХУНКИ З ЗНИЖКАМИ (BILLS WITH DISCOUNTS) - ОСНОВНІ МЕТОДИ
    // ========================================

    async createBillWithDiscount(data) {
        try {
            // Отримуємо інформацію про послугу
            const serviceInfo = await sqlRequest(
                `SELECT id, name, price, lesson_count FROM sport.services WHERE id = $1`,
                [data.service_id]
            );
            
            if (!serviceInfo || !serviceInfo.length) {
                throw new Error('Послугу не знайдено');
            }
            
            const service = serviceInfo[0];
            const originalPrice = service.price;
            const hasDiscount = !!data.discount_type;
            const finalPrice = hasDiscount ? Math.round(originalPrice * 0.5) : originalPrice;
            
            const sql = `
                INSERT INTO sport.payments
                (membership_number, client_name, phone_number, service_id, visit_count, 
                original_price, total_price, discount_type, discount_applied, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
                RETURNING id`;
                
            const result = await sqlRequest(sql, [
                data.membership_number,
                data.client_name,
                data.phone_number,
                data.service_id,
                service.lesson_count,
                originalPrice,
                finalPrice,
                data.discount_type || null,
                hasDiscount
            ]);
            
            // Оновлюємо клієнта
            const updateClientSql = `
                UPDATE sport.clients
                SET current_service_id = $1,
                    current_service_name = $2,
                    remaining_visits = $3,
                    last_bill_id = $4,
                    discount_type = $5
                WHERE membership_number = $6
            `;
            
            await sqlRequest(updateClientSql, [
                service.id,
                service.name,
                service.lesson_count,
                result[0].id,
                data.discount_type || null,
                data.membership_number
            ]);
            
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][createBillWithDiscount]", error);
            throw error;
        }
    }

    async updateBillWithDiscount(id, data) {
        try {
            // Отримуємо інформацію про послугу
            const serviceInfo = await sqlRequest(
                `SELECT id, name, price, lesson_count FROM sport.services WHERE id = $1`,
                [data.service_id]
            );
            
            if (!serviceInfo || !serviceInfo.length) {
                throw new Error('Послугу не знайдено');
            }
            
            const service = serviceInfo[0];
            const originalPrice = service.price;
            const hasDiscount = !!data.discount_type;
            const finalPrice = hasDiscount ? Math.round(originalPrice * 0.5) : originalPrice;
            
            const sql = `
                UPDATE sport.payments
                SET membership_number = $1, client_name = $2, phone_number = $3, 
                    service_id = $4, visit_count = $5, original_price = $6,
                    total_price = $7, discount_type = $8, discount_applied = $9
                WHERE id = $10
                RETURNING id
            `;
            
            const result = await sqlRequest(sql, [
                data.membership_number,
                data.client_name,
                data.phone_number,
                data.service_id,
                service.lesson_count,
                originalPrice,
                finalPrice,
                data.discount_type || null,
                hasDiscount,
                id
            ]);
            
            // Оновлюємо клієнта
            const updateClientSql = `
                UPDATE sport.clients
                SET current_service_id = $1,
                    current_service_name = $2,
                    remaining_visits = $3,
                    discount_type = $4
                WHERE membership_number = $5
            `;
            
            await sqlRequest(updateClientSql, [
                service.id,
                service.name,
                service.lesson_count,
                data.discount_type || null,
                data.membership_number
            ]);
            
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][updateBillWithDiscount]", error);
            throw error;
        }
    }

    async findBillsByFilterWithDiscount(limit, offset, displayFields, allowedFields, dateFilter = {}) {
        try {
            let sql = `
                SELECT json_agg(rw) as data,
                COALESCE(max(cnt), 0) as count
                FROM (
                    SELECT json_build_object(
                        'id', p.id,
                        'membership_number', p.membership_number,
                        'client_name', p.client_name,
                        'phone_number', p.phone_number,
                        'service_group', sg.name,
                        'service_name', s.name,
                        'visit_count', p.visit_count,
                        'total_price', p.total_price,
                        'original_price', p.original_price,
                        'discount_type', p.discount_type,
                        'discount_applied', p.discount_applied,
                        'created_at', p.created_at
                    ) as rw,
                    count(*) over() as cnt
                    FROM sport.payments p
                    LEFT JOIN sport.services s ON p.service_id = s.id
                    LEFT JOIN sport.service_groups sg ON s.service_group_id = sg.id
                    WHERE 1=1`;
            
            const values = [];
            let paramIndex = 1;
            
            // Фільтр за датою (додаємо ПЕРЕД текстовими фільтрами)
            if (dateFilter.startDate) {
                sql += ` AND DATE(p.created_at) >= $${paramIndex}`;
                values.push(dateFilter.startDate);
                paramIndex++;
            }
            
            if (dateFilter.endDate) {
                sql += ` AND DATE(p.created_at) <= $${paramIndex}`;
                values.push(dateFilter.endDate);
                paramIndex++;
            }
            
            // Текстові фільтри
            for (const key in allowedFields) {
                sql += ` AND p.${key} ILIKE $${paramIndex}`;
                values.push(`%${allowedFields[key]}%`);
                paramIndex++;
            }
            
            sql += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex+1}) q`;
            values.push(limit, offset);
            
            return await sqlRequest(sql, values);
        } catch (error) {
            logger.error("[SportsComplexRepository][findBillsByFilterWithDiscount]", error);
            throw error;
        }
    }

    async getBillByIdWithDiscount(id) {
        try {
            const sql = `
                SELECT 
                    p.id,
                    p.membership_number,
                    p.client_name,
                    p.phone_number,
                    sg.id AS service_group_id,
                    sg.name AS service_group,
                    s.id AS service_id,
                    s.name AS service_name,
                    p.visit_count,
                    p.original_price,
                    p.total_price,
                    p.discount_type,
                    p.discount_applied,
                    p.created_at,
                    s.price
                FROM 
                    sport.payments p
                JOIN 
                    sport.services s ON p.service_id = s.id
                JOIN 
                    sport.service_groups sg ON s.service_group_id = sg.id
                WHERE 
                    p.id = $1
            `;
            const result = await sqlRequest(sql, [id]);
            return result[0];
        } catch (error) {
            logger.error("[SportsComplexRepository][getBillByIdWithDiscount]", error);
            throw error;
        }
    }
}

module.exports = new SportsComplexRepository();