import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Context } from '../../main';
import { generateIcon, iconMap, STATUS } from '../../utils/constants';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Table from '../../components/common/Table/Table';
import useFetch from "../../hooks/useFetch";
import PageError from "../ErrorPage/PageError";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";

// Визначаємо іконки на рівні компонента
const viewIcon = generateIcon(iconMap.view)
const addIcon = generateIcon(iconMap.plus)
const searchIcon = generateIcon(iconMap.search, 'input-icon')
const editIcon = generateIcon(iconMap.edit)

const AccountsList = () => {
    const navigate = useNavigate();
    const { store } = useContext(Context);
    const [state, setState] = useState({
        sendData: {
            limit: 10,
            page: 1,
            search: ''
        }
    });

    const isFirstRun = useRef(true);
    const { error, status, data, retryFetch } = useFetch('api/cnap/accounts/filter', {
        method: 'post',
        data: state.sendData
    });

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }
        retryFetch();
    }, [state.sendData]);

    const handleView = useCallback((id) => {
        navigate(`/cnap/accounts/${id}`);
    }, [navigate]);

    const handleAdd = useCallback(() => {
        navigate('/cnap/accounts/create');
    }, [navigate]);

    const handleSearch = useCallback((_, value) => {
        setState(prev => ({
            ...prev,
            sendData: {
                ...prev.sendData,
                page: 1,
                search: value
            }
        }));
    }, []);

    const handlePageChange = (page) => {
        setState(prev => ({
            ...prev,
            sendData: {
                ...prev.sendData,
                page
            }
        }));
    };

    const columns = useMemo(() => [
        {
            title: '№',
            dataIndex: 'id',
            width: '5%'
        },
        {
            title: 'Номер рахунку',
            dataIndex: 'account_number',
            width: '15%'
        },
        {
            title: 'Дата',
            dataIndex: 'date',
            width: '10%'
        },
        {
            title: 'Час',
            dataIndex: 'time',
            width: '10%'
        },
        {
            title: 'Назва послуги',
            dataIndex: 'service_name',
            width: '20%'
        },
        {
            title: 'Платник',
            dataIndex: 'payer',
            width: '15%'
        },
        {
            title: 'Сума',
            dataIndex: 'amount',
            width: '10%'
        },
        {
            title: 'Адміністратор',
            dataIndex: 'administrator',
            width: '15%'
        },
        {
            title: 'Дії',
            width: '10%',
            render: (_, record) => (
                <div className="btn-sticky" style={{ justifyContent: 'center' }}>
                    <Button
                        type="text"
                        title="Перегляд"
                        icon={viewIcon}
                        onClick={() => handleView(record.id)}
                    />
                    <Button
                        title="Реквізити"
                        icon={editIcon}
                        onClick={() => navigate(`/cnap/accounts/${record.id}/print`)}/>
                    
                </div>
            )
        }
    ], [handleView]);

    const tableData = useMemo(() => {
        if (data?.items?.length) {
            return data.items.map(item => {
                // Форматуємо дату
                const date = new Date(item.date);
                const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;

                // Форматуємо час
                const formattedTime = item.time ? item.time.split('.')[0] : '';

                // Форматуємо суму
                const amount = parseFloat(item.amount);
                const formattedAmount = isNaN(amount) ? '0 грн' : `${amount.toFixed(2)} грн`;

                return {
                    key: item.id,
                    id: item.id,
                    account_number: item.account_number,
                    date: formattedDate,
                    time: formattedTime,
                    service_name: item.service_name,
                    payer: item.payer,
                    amount: formattedAmount,
                    administrator: item.administrator
                };
            });
        }
        return [];
    }, [data]);

    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    if (status === STATUS.LOADING) {
        return <SkeletonPage />;
    }

    return (
        <div className="page-container">
            <div className="page-container__header">
                <div className="page-container__title">
                    Рахунки
                </div>
                <Button
                    type="primary"
                    icon={addIcon}
                    onClick={handleAdd}
                >
                    Створити рахунок
                </Button>
            </div>
            <div className="page-filter">
                <Input
                    placeholder="Пошук за номером рахунку або платником"
                    value={state.sendData.search}
                    onChange={handleSearch}
                    icon={searchIcon}
                />
            </div>
            <div className="page-container__content">
                <Table
                    columns={columns}
                    dataSource={tableData}
                    pagination={{
                        current: state.sendData.page,
                        pageSize: state.sendData.limit,
                        total: data?.totalItems || 0,
                        onChange: handlePageChange
                    }}
                />
            </div>
        </div>
    );
};

export default AccountsList;
