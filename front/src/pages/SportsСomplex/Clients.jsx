import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from "../../hooks/useFetch";
import Table from "../../components/common/Table/Table";
import { generateIcon, iconMap, STATUS } from "../../utils/constants.jsx";
import Button from "../../components/common/Button/Button";
import PageError from "../ErrorPage/PageError";
import classNames from "classnames";
import Pagination from "../../components/common/Pagination/Pagination";
import Input from "../../components/common/Input/Input";
import { fetchFunction, hasOnlyAllowedParams, validateFilters } from "../../utils/function";
import { useNotification } from "../../hooks/useNotification";
import { Context } from "../../main";
import Dropdown from "../../components/common/Dropdown/Dropdown";
import SkeletonPage from "../../components/common/Skeleton/SkeletonPage";
import Modal from "../../components/common/Modal/Modal.jsx";
import { Transition } from "react-transition-group";
import FormItem from "../../components/common/FormItem/FormItem";

// Іконки
const editIcon = generateIcon(iconMap.edit);
const filterIcon = generateIcon(iconMap.filter);
const searchIcon = generateIcon(iconMap.search, 'input-icon');
const dropDownIcon = generateIcon(iconMap.arrowDown);
const addIcon = generateIcon(iconMap.add);
const dropDownStyle = { width: '100%' };
const childDropDownStyle = { justifyContent: 'center' };

const Clients = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const addFormRef = useRef(null);
    const editFormRef = useRef(null);
    const isFirstRun = useRef(true);
    
    const [state, setState] = useState({
        isOpen: false,
        selectData: {},
        sendData: {
            limit: 16,
            page: 1,
        }
    });
    
    // Стан для модального вікна створення клієнта
    const [createModalState, setCreateModalState] = useState({
        isOpen: false,
        loading: false,
        formData: {
            name: '',
            membership_number: '',
            phone_number: '',
            subscription_duration: ''
        }
    });

    // Стан для модального вікна редагування
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        clientId: null,
        formData: {
            name: '',
            membership_number: '',
            phone_number: '',
            subscription_duration: ''
        }
    });

    // Завантаження даних клієнтів
    const {error, status, data, retryFetch} = useFetch('api/sportscomplex/clients/filter', {
        method: 'post',
        data: state.sendData
    });

    // Ефект для оновлення даних при зміні параметрів пошуку
    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false
            return;
        }
        retryFetch('api/sportscomplex/clients/filter', {
            method: 'post',
            data: state.sendData,
        })
    }, [state.sendData, retryFetch]);

    const startRecord = ((state.sendData.page || 1) - 1) * state.sendData.limit + 1;
    const endRecord = Math.min(startRecord + state.sendData.limit - 1, parseInt(data?.totalItems) || 1);

    // Визначення колонок таблиці
    const columnTable = useMemo(() => [
        {
            title: 'ПІБ',
            dataIndex: 'name',
            width: '25%'
        },
        {
            title: 'Номер абонемента',
            dataIndex: 'membership_number',
            width: '20%'
        },
        {
            title: 'Номер телефону',
            dataIndex: 'phone_number',
            width: '20%'
        },
        {
            title: 'Час абонемента',
            dataIndex: 'subscription_duration',
            width: '20%'
        },
        {
            title: 'Дія',
            dataIndex: 'action',
            width: '15%',
            render: (_, record) => (
                <div className="btn-sticky" style={{ justifyContent: 'center' }}>
                    <Button
                        title="Редагувати"
                        icon={editIcon}
                        onClick={() => handleOpenEditModal(record)}
                    />
                </div>
            )
        }
    ], []);

    // Підготовка даних для таблиці
    const tableData = useMemo(() => {
        if (!Array.isArray(data?.items)) return [];
        return data.items.map(el => ({
            key: el.id,
            id: el.id,
            name: el.name,
            membership_number: el.membership_number,
            phone_number: el.phone_number,
            subscription_duration: el.subscription_duration
        }));
    }, [data]);

    // Пункти меню для вибору кількості записів на сторінці
    const itemMenu = [16, 32, 48].map(size => ({
        label: `${size}`,
        key: `${size}`,
        onClick: () => {
            if (state.sendData.limit !== size) {
                setState(prev => ({...prev, sendData: {...prev.sendData, limit: size, page: 1}}));
            }
        }
    }));

    // Функції для фільтрів
    const filterHandleClick = () => setState(prev => ({...prev, isOpen: !prev.isOpen}));

    const onHandleChange = (name, value) => setState(prev => ({
        ...prev, 
        selectData: {...prev.selectData, [name]: value}
    }));

    // Функції для модального вікна створення
    const onCreateFormChange = (name, value) => {
        setCreateModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));
    };

    // Функції для модального вікна редагування
    const onEditFormChange = (name, value) => {
        setEditModalState(prev => ({
            ...prev,
            formData: {
                ...prev.formData,
                [name]: value
            }
        }));
    };

    // Функції для фільтрів
    const resetFilters = () => {
        setState(prev => ({...prev, selectData: {}}));
        
        const dataReadyForSending = hasOnlyAllowedParams(state.sendData, ['limit', 'page']);
        if (!dataReadyForSending) {
            setState(prev => ({...prev, sendData: {limit: prev.sendData.limit, page: 1}}));
        }
    };

    const applyFilter = () => {
        if (Object.values(state.selectData).some(val => val)) {
            const dataValidation = validateFilters(state.selectData);
            if (!dataValidation.error) {
                setState(prev => ({...prev, sendData: {...dataValidation, limit: prev.sendData.limit, page: 1}}));
            } else {
                notification({ 
                    type: 'warning', 
                    title: 'Помилка', 
                    message: dataValidation.message,
                    placement: 'top' 
                });
            }
        }
    };

    // Функція для навігації по сторінках
    const onPageChange = useCallback(page => setState(prev => ({...prev, sendData: {...prev.sendData, page}})), []);

    // Функції для модального вікна створення
    const openCreateModal = () => {
        // Генеруємо номер абонемента - 6 випадкових цифр
        const membershipNumber = Math.floor(100000 + Math.random() * 900000).toString();
        
        setCreateModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                name: '',
                membership_number: membershipNumber,
                phone_number: '',
                subscription_duration: ''
            }
        }));
        document.body.style.overflow = 'hidden';
    };
    
    const closeCreateModal = () => {
        setCreateModalState(prev => ({ ...prev, isOpen: false }));
        document.body.style.overflow = 'auto';
    };

    // Функції для модального вікна редагування
    const handleOpenEditModal = async (client) => {
        setEditModalState(prev => ({
            ...prev,
            isOpen: true,
            clientId: client.id,
            formData: {
                name: client.name,
                membership_number: client.membership_number,
                phone_number: client.phone_number,
                subscription_duration: client.subscription_duration
            }
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false, clientId: null }));
        document.body.style.overflow = 'auto';
    };

    // Функція для створення клієнта
    const handleCreateFormSubmit = async () => {
        const { name, membership_number, phone_number, subscription_duration } = createModalState.formData;
        
        if (!name || !membership_number || !phone_number || !subscription_duration) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Всі поля форми обов\'язкові для заповнення',
            });
            return;
        }
        
        try {
            setCreateModalState(prev => ({...prev, loading: true}));
            
            await fetchFunction('/api/sportscomplex/clients', {
                method: 'post',
                data: {
                    name,
                    membership_number,
                    phone_number,
                    subscription_duration
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Клієнта успішно створено',
            });
            
            retryFetch('/api/sportscomplex/clients/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeCreateModal();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error?.response?.data?.error || error.message,
                placement: 'top',
            });
        } finally {
            setCreateModalState(prev => ({...prev, loading: false}));
        }
    };

    // Функція для редагування клієнта
    const handleEditFormSubmit = async () => {
        const { name, membership_number, phone_number, subscription_duration } = editModalState.formData;
        
        if (!name || !membership_number || !phone_number || !subscription_duration) {
            notification({
                type: 'warning',
                placement: 'top',
                title: 'Помилка',
                message: 'Всі поля форми обов\'язкові для заповнення',
            });
            return;
        }
        
        try {
            setEditModalState(prev => ({...prev, loading: true}));
            
            await fetchFunction(`/api/sportscomplex/clients/${editModalState.clientId}`, {
                method: 'put',
                data: {
                    name,
                    membership_number,
                    phone_number,
                    subscription_duration
                }
            });
            
            notification({
                type: 'success',
                placement: 'top',
                title: 'Успіх',
                message: 'Клієнта успішно оновлено',
            });
            
            retryFetch('/api/sportscomplex/clients/filter', {
                method: 'post',
                data: state.sendData,
            });
            
            closeEditModal();
        } catch (error) {
            if (error?.response?.status === 401) {
                notification({
                    type: 'warning',
                    title: "Помилка",
                    message: "Не авторизований",
                    placement: 'top',
                });
                store.logOff();
                return navigate('/');
            }
            
            notification({
                type: 'warning',
                title: "Помилка",
                message: error?.response?.data?.message || error?.response?.data?.error || error.message,
                placement: 'top',
            });
        } finally {
            setEditModalState(prev => ({...prev, loading: false}));
        }
    };

    // Обробка помилок
    if (status === STATUS.ERROR) {
        return <PageError title={error.message} statusError={error.status} />;
    }

    return (
        <>
            {status === STATUS.PENDING && <SkeletonPage />}
            
            {status === STATUS.SUCCESS && (
                <div className="table-elements">
                    <div className="table-header">
                        <h2 className="title title--sm">
                            {data?.items?.length ? 
                                `Показує ${startRecord}-${endRecord} з ${data?.totalItems}` : 
                                'Записів не знайдено'
                            }
                        </h2>
                        <div className="table-header__buttons">
                            <Button 
                                className="btn--primary"
                                onClick={openCreateModal}
                                icon={addIcon}
                            >
                                Додати
                            </Button>
                            <Dropdown 
                                icon={dropDownIcon} 
                                iconPosition="right" 
                                style={dropDownStyle} 
                                childStyle={childDropDownStyle} 
                                caption={`Записів: ${state.sendData.limit}`} 
                                menu={itemMenu} 
                            />
                            <Button 
                                className="table-filter-trigger" 
                                onClick={filterHandleClick} 
                                icon={filterIcon}
                            >
                                Фільтри
                            </Button>
                        </div>
                    </div>
                    <div className="table-main">
                        <div 
                            style={{width: data?.items?.length > 0 ? 'auto' : '100%'}} 
                            className={classNames("table-and-pagination-wrapper", {"table-and-pagination-wrapper--active": state.isOpen})}
                        >
                            <Table 
                                columns={Array.isArray(columnTable) ? columnTable.filter(Boolean) : []} 
                                dataSource={Array.isArray(tableData) ? tableData : []}
                            />
                            <Pagination 
                                className="m-b" 
                                currentPage={parseInt(data?.currentPage) || 1} 
                                totalCount={parseInt(data?.totalItems) || 1} 
                                pageSize={state.sendData.limit} 
                                onPageChange={onPageChange} 
                            />
                        </div>
                        <div className={`table-filter ${state.isOpen ? "table-filter--active" : ""}`}>
                            <h3 className="title title--sm">Фільтри</h3>
                            <div className="btn-group">
                                <Button onClick={applyFilter}>Застосувати</Button>
                                <Button className="btn--secondary" onClick={resetFilters}>Скинути</Button>
                            </div>
                            <div className="table-filter__item">
                                <Input 
                                    icon={searchIcon} 
                                    name="name" 
                                    placeholder="ПІБ клієнта" 
                                    value={state.selectData?.name || ''} 
                                    onChange={onHandleChange} 
                                />
                            </div>
                            <div className="table-filter__item">
                                <Input 
                                    icon={searchIcon} 
                                    name="membership_number" 
                                    placeholder="Номер абонемента" 
                                    value={state.selectData?.membership_number || ''} 
                                    onChange={onHandleChange} 
                                />
                            </div>
                            <div className="table-filter__item">
                                <Input 
                                    icon={searchIcon} 
                                    name="phone_number" 
                                    placeholder="Номер телефону" 
                                    value={state.selectData?.phone_number || ''} 
                                    onChange={onHandleChange} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Модальне вікно для створення нового клієнта */}
            <Transition in={createModalState.isOpen} timeout={200} unmountOnExit nodeRef={addFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeCreateModal}
                        onOk={handleCreateFormSubmit}
                        confirmLoading={createModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Створення нового клієнта"
                        width="600px"
                    >
                        <div className="form-container">
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="name"
                                    value={createModalState.formData.name}
                                    onChange={onCreateFormChange}
                                    placeholder="Введіть ПІБ клієнта"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                                tooltip="Номер абонемента генерується автоматично"
                            >
                                <Input
                                    name="membership_number"
                                    value={createModalState.formData.membership_number}
                                    onChange={onCreateFormChange}
                                    placeholder="Автоматично згенерований"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер телефону" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="phone_number"
                                    value={createModalState.formData.phone_number}
                                    onChange={onCreateFormChange}
                                    placeholder="Введіть номер телефону"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Час абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="subscription_duration"
                                    value={createModalState.formData.subscription_duration}
                                    onChange={onCreateFormChange}
                                    placeholder="Наприклад: 1 місяць, 3 місяці"
                                />
                            </FormItem>
                        </div>
                    </Modal>
                )}
            </Transition>
            
            {/* Модальне вікно для редагування клієнта */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? "modal-window-wrapper--active" : ""}
                        onClose={closeEditModal}
                        onOk={handleEditFormSubmit}
                        confirmLoading={editModalState.loading}
                        cancelText="Скасувати"
                        okText="Зберегти"
                        title="Редагування клієнта"
                        width="600px"
                    >
                        <div className="form-container">
                            <FormItem 
                                label="ПІБ клієнта" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="name"
                                    value={editModalState.formData.name}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть ПІБ клієнта"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="membership_number"
                                    value={editModalState.formData.membership_number}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть номер абонемента"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Номер телефону" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="phone_number"
                                    value={editModalState.formData.phone_number}
                                    onChange={onEditFormChange}
                                    placeholder="Введіть номер телефону"
                                />
                            </FormItem>
                            
                            <FormItem 
                                label="Час абонемента" 
                                required 
                                fullWidth
                            >
                                <Input
                                    name="subscription_duration"
                                    value={editModalState.formData.subscription_duration}
                                    onChange={onEditFormChange}
                                    placeholder="Наприклад: 1 місяць, 3 місяці"
                                />
                            </FormItem>
                        </div>
                    </Modal>
                )}
            </Transition>
        </>
    );
};

export default Clients;