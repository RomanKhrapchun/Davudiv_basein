const { Paragraph, TextRun, patchDocument, TableRow, TableCell, Table, VerticalAlign, HeadingLevel, PatchType, AlignmentType, WidthType, ExternalHyperlink, ImageRun } = require('docx')
const { addRequisiteToLandDebt,addRequisiteToWaterDebt } = require('./function');
const { territory_title, territory_title_instrumental, phone_number_GU_DPS, website_name, website_url, telegram_name, telegram_url } = require('./constants');
const fs = require('fs').promises

const oneCellWidth = {
    size: 750,
    type: WidthType.PERCENTAGE
}

const addRow = (body) => {
    return body.map((el) => {
        return new TableRow({
            children: [
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: el?.label, font: "Times New Roman", size: 26, bold: true })
                            ],
                            alignment: AlignmentType.CENTER,
                        })
                    ],
                    width: oneCellWidth,
                    verticalAlign: 'center',
                }),
                new TableCell({
                    children: [
                        new Paragraph({
                            children: [
                                new TextRun({ text: el?.value, font: "Times New Roman", size: 26, })
                            ],
                            alignment: AlignmentType.CENTER,
                        })
                    ],
                    width: oneCellWidth,
                    verticalAlign: 'center',
                }),
            ],
        })
    })

};





const createRequisiteWord = async (body, requisite) => {
    try {
        console.log("body", body);

        // Використовуємо .flat() для обробки можливих вкладених масивів
        const debts = addRequisiteToLandDebt(body, requisite).flat();

        console.log("📌 debts після .flat():", debts);

        if (!Array.isArray(debts) || debts.length === 0) {
            throw new Error("❌ ПОМИЛКА: debts порожній або не є масивом!");
        }

        const docBuffer = await fs.readFile("./files/doc1.docx");

        let totalAmount = 0; // Загальна сума всіх боргів

        const children = debts.map((debt, index) => {
            totalAmount += parseFloat(debt.amount || 0); // Додаємо до загальної суми

            return [
		new Paragraph({ children: [new TextRun({ text: " " })] }),
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                        new TextRun({ 
                            text: `          ${index + 1}. ${debt.debtText}`, // Додаємо нумерацію
                            font: "Times New Roman",
                            size: 26
                        }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: `{{requisiteText${index}}}`, font: "Times New Roman", size: 26 }),
                    ],
                }),
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                        new TextRun({ text: `{{table${index}}}`, font: "Times New Roman", size: 26 }),
                    ],
                }),
                /*new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                        new TextRun({
                            text: `Загальна сума боргу по цій таблиці: ${debt.amount} грн`,
                            font: "Times New Roman",
                            size: 26,
                            bold: true
                        }),
                    ],
                }),*/
                //new Paragraph({ children: [new TextRun({ text: " " })] }),
            ];
        }).flat();

        const patches = {
            next: { type: PatchType.DOCUMENT, children },
            name: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: body.name, font: "Times New Roman", size: 26, bold: true })
                        ],
                        alignment: AlignmentType.RIGHT
                    })
                ],
            },
            ident: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `і.к. ХХХХХХХ${body.identification}`, font: "Times New Roman", size: 24, bold: true, italics: true })
                        ],
                        alignment: AlignmentType.RIGHT
                    })
                ],
            },
            debt_info: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `          ${territory_title} повідомляє, що відповідно до даних ГУ ДПС у Львівській області, станом ${new Intl.DateTimeFormat('uk-UA', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                }).format(new Date(body.date))} у Вас наявна заборгованість до бюджету ${territory_title_instrumental},  а саме:`,
                                font: "Times New Roman",
                                size: 26
                            })
                        ],
                    })
                ],
            },
            gu_dps: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `          В разі виникнення питань по даній заборгованості, звертайтесь у ГУ ДПС у Львівській області за номером телефона ${phone_number_GU_DPS}.`,
                                font: "Times New Roman",
                                size: 24
                            })
                        ],
                        alignment: AlignmentType.LEFT
                    })
                ],
            },
            sanction_info: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `          Просимо терміново погасити утворену Вами заборгованість до бюджету ${territory_title_instrumental}. Несвоєчасна сплата суми заборгованості призведе до нарахувань штрафних санкцій та пені.`,
                                font: "Times New Roman",
                                size: 24
                            })
                        ],
                        alignment: AlignmentType.LEFT
                    })
                ],
            },
            footer_info: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `          Перевірити заборгованість можна у застосунках «${website_name}» `, font: "Times New Roman", size: 24 }),
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: website_url,
                                        font: "Times New Roman",
                                        size: 24,
                                        color: "0000FF",
                                        underline: {}
                                    }),
                                ],
                                link: website_url,
                            }),
                            new TextRun({ text: ` або через чат-бот в Telegram «${telegram_name}» `, font: "Times New Roman", size: 24 }),
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: telegram_url,
                                        font: "Times New Roman",
                                        size: 24,
                                        color: "0000FF",
                                        underline: {}
                                    }),
                                ],
                                link: telegram_url,
                            }),
                            new TextRun({ text: `. Вони дозволяють отримати актуальну інформацію щодо стану вашої заборгованості та оплатити її онлайн за допомогою QR-коду, що розміщений нижче.`, font: "Times New Roman", size: 24 }),
                        ],
                        alignment: AlignmentType.LEFT
                    })
                ],
            },
            image: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: await fs.readFile("./files/qr-code.png"),
                                transformation: {
                                    width: 128,
                                    height: 128,
                                },
                            }),
                        ],
                        alignment: AlignmentType.RIGHT
                    })
                ],
            },
        };

        // Додаємо патчі для кожного об'єкта debt
        debts.forEach((debt, index) => {
            patches[`debtText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: debt.debtText || "❌ ПОМИЛКА: Текст боргу відсутній",
                        font: "Times New Roman",
                        size: 26
                    })
                ],
            };

            patches[`requisiteText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: debt.requisiteText || "❌ ПОМИЛКА: Реквізити відсутні",
                        font: "Times New Roman",
                        bold: true,
                        size: 26
                    })
                ],
            };

             patches[`table${index}`] = {
                type: PatchType.DOCUMENT,
                children: [
                    new Table({
                        rows: [
                            ...addRow(debt.table || []),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ 
                                                        text: "Сума", 
                                                        font: "Times New Roman", 
                                                        bold: true, 
                                                        size: 24 
                                                    })
                                                ]
                                            })
                                        ],
                                    }),
                                    new TableCell({
                                        width: { size: 50, type: WidthType.PERCENTAGE },
                                        children: [
                                            new Paragraph({
                                                alignment: AlignmentType.CENTER,
                                                children: [
                                                    new TextRun({ 
                                                        text: `${debt.amount} грн`, 
                                                        font: "Times New Roman",  
                                                        size: 24
                                                    })
                                                ]
                                            })
                                        ],
                                    }),
                                ],
                            }),
                        ]
                    })
                ],
            };
        });

        // Додаємо загальну суму після циклу
        patches[`totalAmount`] = {
            type: PatchType.DOCUMENT,
            children: [
                new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [
                        new TextRun({
                            text: `Загальна сума боргу по всіх платежах: ${totalAmount.toFixed(2)} грн`,
                            font: "Times New Roman",
                            size: 22, // Менший шрифт
                            bold: true
                        }),
                    ],
                }),
            ],
        };

        const patchedDoc = await patchDocument(docBuffer, { patches });
        return patchedDoc;
    } catch (error) {
        console.error('❌ Помилка під час створення документа:', error.message);
        return false;
    }
};




const createUtilitiesRequisiteWord = async (body, requisite) => {
    try {
        if (!Array.isArray(body)) {
            throw new Error("body має бути масивом");
        }

        const debts = body.map(item => {
            const result = addRequisiteToWaterDebt(item, requisite);
            if (!result) {
                console.warn("⚠️ Попередження: addRequisiteToWaterDebt повернула undefined або некоректний об'єкт для", item);
            }
            return result;
        }).flat().filter(Boolean); // Видаляємо undefined

        console.log("debts",debts);

        const docBuffer = await fs.readFile("./files/docWater.docx");

        const children = debts.map((_, index) => [
            new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                    new TextRun({ text: `{{debtText${index}}}`, font: "Times New Roman", size: 26 }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({ text: `{{requisiteText${index}}}`, font: "Times New Roman", size: 26 }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                    new TextRun({ text: `{{table${index}}}`, font: "Times New Roman", size: 26 }),
                ],
            }),
        ]).flat();

        // Перевіряємо, чи дата коректна
        let formattedDate;
        try {
            formattedDate = new Intl.DateTimeFormat('uk-UA', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }).format(new Date(body[0].date));
        } catch (error) {
            console.warn("❗ Помилка форматування дати. Використовується поточна дата.");
            formattedDate = new Intl.DateTimeFormat('uk-UA', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }).format(new Date());
        }

        const patches = {
            next: {
                type: PatchType.DOCUMENT,
                children,
            },
            name: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: body[0].fio, font: "Times New Roman", size: 26, bold: true })
                        ],
                        alignment: AlignmentType.CENTER
                    })
                ],
            },
            ident: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `і.к. ${body[0].payerident}`, font: "Times New Roman", size: 24, bold: true, italics: true })
                        ],
                        alignment: AlignmentType.CENTER
                    })
                ],
            },
            debt_info: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `          ${territory_title} повідомляє, що відповідно до наявних даних, станом на ${formattedDate} у Вас існує заборгованість з оплати комунальних послуг перед ${territory_title_instrumental}.`,
                                font: "Times New Roman", size: 26
                            })
                        ],
                    })
                ],
            },
            support_info: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `          Якщо у вас виникли питання щодо цієї заборгованості, будь ласка, звертайтеся за телефоном служби підтримки: ${phone_number_GU_DPS}.`,
                                font: "Times New Roman", size: 24
                            })
                        ],
                        alignment: AlignmentType.LEFT
                    })
                ],
            },
            sanction_info: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `          Просимо вас своєчасно оплатити заборгованість, щоб уникнути можливих штрафних санкцій та припинення надання комунальних послуг.`,
                                font: "Times New Roman", size: 24
                            })
                        ],
                        alignment: AlignmentType.LEFT
                    })
                ],
            },
            footer_info: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `          Ви можете перевірити заборгованість та здійснити оплату через застосунок «${website_name}» `, font: "Times New Roman", size: 24 }),
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: website_url,
                                        font: "Times New Roman",
                                        size: 24,
                                        color: "0000FF",
                                        underline: {}
                                    }),
                                ],
                                link: website_url,
                            }),
                            new TextRun({ text: ` або через чат-бот в Telegram «${telegram_name}» `, font: "Times New Roman", size: 24 }),
                            new ExternalHyperlink({
                                children: [
                                    new TextRun({
                                        text: telegram_url,
                                        font: "Times New Roman",
                                        size: 24,
                                        color: "0000FF",
                                        underline: {}
                                    }),
                                ],
                                link: telegram_url,
                            }),
                            new TextRun({ text: `. Вони дозволяють отримати актуальну інформацію щодо стану вашої заборгованості та оплатити її онлайн за допомогою QR-коду, що розміщений нижче.`, font: "Times New Roman", size: 24 }),
                        ],
                        alignment: AlignmentType.LEFT
                    })
                ],
            },
            image: {
                type: PatchType.DOCUMENT,
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: await fs.readFile("./files/qr-code.png"),
                                transformation: {
                                    width: 128,
                                    height: 128,
                                },
                            }),
                        ],
                        alignment: AlignmentType.RIGHT
                    })
                ],
            },
        };

        // Додаємо патчі для кожного об'єкта debt
        debts.forEach((debt, index) => {
            patches[`debtText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: `${debt.debtText}`,
                        font: "Times New Roman",
                        size: 26
                    })
                ],
            };

            patches[`requisiteText${index}`] = {
                type: PatchType.PARAGRAPH,
                children: [
                    new TextRun({
                        text: `${debt.requisiteText}`,
                        font: "Times New Roman",
                        bold: true,
                        size: 26
                    })
                ],
            };

            patches[`table${index}`] = {
                type: PatchType.DOCUMENT,
                children: [
                    new Table({
                        rows: addRow(debt.table)
                    })
                ],
            };
        });

        const patchedDoc = await patchDocument(docBuffer, { patches });
        return patchedDoc;
    } catch (error) {
        console.error('❌ Помилка під час створення документа:', error.message);
        return false;
    }
};



module.exports = {
    createRequisiteWord,
    createUtilitiesRequisiteWord
}







