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
const eyeIcon = generateIcon(iconMap.eye); // Додаємо іконку ока для оновлення абонемента
const dropDownStyle = { width: '100%' };
const childDropDownStyle = { justifyContent: 'center' };

const Clients = () => {
    const navigate = useNavigate();
    const notification = useNotification();
    const { store } = useContext(Context);
    const addFormRef = useRef(null);
    const editFormRef = useRef(null);
    const confirmFormRef = useRef(null);
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
            subscription_duration: '',
            service_name: ''
        }
    });
    
    // Стан для модального вікна редагування клієнта
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        loading: false,
        clientId: null,
        formData: {
            name: '',
            membership_number: '',
            phone_number: '',
            subscription_duration: '',
            service_name: ''
        }
    });

    // Стан для модального вікна підтвердження оновлення абонемента
    const [confirmModalState, setConfirmModalState] = useState({
        isOpen: false,
        loading: false,
        clientId: null,
        clientName: ''
    });

    const { data, status, refetch } = useFetch(
        'api/sportscomplex/clients/filter',
        'post',
        state.sendData,
        true
    );

    // Оновлені колонки таблиці з новими полями
    const columns = useMemo(() => [
        { title: 'ПІБ клієнта', dataIndex: 'name', key: 'name' },
        { title: 'Номер абонемента', dataIndex: 'membership_number', key: 'membership_number' },
        { title: 'Номер телефону', dataIndex: 'phone_number', key: 'phone_number' },
        { 
            title: 'Послуга', 
            dataIndex: 'service_name', 
            key: 'service_name',
            render: (value) => value || 'Загальний доступ'
        },
        { 
            title: 'Кількість відвідувань', 
            dataIndex: 'visit_count', 
            key: 'visit_count',
            render: (value) => value || 0
        },
        {
            title: 'Статус абонемента',
            key: 'subscription_status',
            render: (_, record) => {
                if (!record.subscription_active || record.subscription_days_left <= 0) {
                    return <span style={{ color: 'red' }}>Абонемент не активний, прошу оновіть його</span>;
                }
                return <span style={{ color: 'green' }}>{record.subscription_days_left} днів залишилось</span>;
            }
        },
        {
            title: 'Дії',
            key: 'actions',
            render: (_, record) => (
                <div className="btn-group btn-group--sm">
                    <Button 
                        className="btn--icon" 
                        onClick={() => handleOpenEditModal(record)}
                        title="Редагувати"
                    >
                        {editIcon}
                    </Button>
                    <Button 
                        className="btn--icon" 
                        onClick={() => handleOpenRenewModal(record)}
                        title="Оновити абонемент"
                    >
                        {eyeIcon}
                    </Button>
                </div>
            )
        }
    ], [editIcon, eyeIcon]);

    // Обробка даних таблиці з новими полями
    const tableData = useMemo(() => {
        if (!Array.isArray(data?.items)) return [];
        return data.items.map(el => ({
            key: el.id,
            id: el.id,
            name: el.name,
            membership_number: el.membership_number,
            phone_number: el.phone_number,
            service_name: el.service_name,
            visit_count: el.visit_count,
            subscription_duration: el.subscription_duration,
            subscription_days_left: el.subscription_days_left,
            subscription_active: el.subscription_active
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
        const membershipNumber = Math.floor(100000 + Math.random() * 900000).toString();
        
        setCreateModalState(prev => ({
            ...prev,
            isOpen: true,
            formData: {
                name: '',
                membership_number: membershipNumber,
                phone_number: '',
                subscription_duration: '',
                service_name: ''
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
                subscription_duration: client.subscription_duration,
                service_name: client.service_name || ''
            }
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeEditModal = () => {
        setEditModalState(prev => ({ ...prev, isOpen: false, clientId: null }));
        document.body.style.overflow = 'auto';
    };

    // Функції для модального вікна підтвердження оновлення абонемента
    const handleOpenRenewModal = (client) => {
        setConfirmModalState(prev => ({
            ...prev,
            isOpen: true,
            clientId: client.id,
            clientName: client.name
        }));
        document.body.style.overflow = 'hidden';
    };

    const closeRenewModal = () => {
        setConfirmModalState(prev => ({ ...prev, isOpen: false, clientId: null, clientName: '' }));
        document.body.style.overflow = 'auto';
    };

    // Функція для створення клієнта
    const handleCreateFormSubmit = async () => {
        const { name, membership_number, phone_number, subscription_duration, service_name } = createModalState.formData;
        
        if (!name || !membership_number || !phone_number || !subscription_duration) {
            notification({
                type: 'warning',
                title: 'Попередження',
                message: 'Будь ласка, заповніть всі обов\'язкові поля',
                placement: 'top'
            });
            return;
        }

        setCreateModalState(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetchFunction('api/sportscomplex/clients', {
                method: 'post',
                data: {
                    name,
                    membership_number,
                    phone_number,
                    subscription_duration,
                    service_name: service_name || 'Загальний доступ'
                }
            });

            if (response.success) {
                notification({
                    type: 'success',
                    title: 'Успіх',
                    message: response.message,
                    placement: 'top'
                });
                closeCreateModal();
                refetch();
            }
        } catch (error) {
            notification({
                type: 'error',
                title: 'Помилка',
                message: error.message || 'Помилка при створенні клієнта',
                placement: 'top'
            });
        } finally {
            setCreateModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Функція для редагування клієнта
    const handleEditFormSubmit = async () => {
        const { name, membership_number, phone_number, subscription_duration, service_name } = editModalState.formData;
        
        if (!name || !membership_number || !phone_number || !subscription_duration) {
            notification({
                type: 'warning',
                title: 'Попередження',
                message: 'Будь ласка, заповніть всі обов\'язкові поля',
                placement: 'top'
            });
            return;
        }

        setEditModalState(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetchFunction(`api/sportscomplex/clients/${editModalState.clientId}`, {
                method: 'put',
                data: {
                    name,
                    membership_number,
                    phone_number,
                    subscription_duration,
                    service_name
                }
            });

            if (response.success) {
                notification({
                    type: 'success',
                    title: 'Успіх',
                    message: response.message,
                    placement: 'top'
                });
                closeEditModal();
                refetch();
            }
        } catch (error) {
            notification({
                type: 'error',
                title: 'Помилка',
                message: error.message || 'Помилка при оновленні клієнта',
                placement: 'top'
            });
        } finally {
            setEditModalState(prev => ({ ...prev, loading: false }));
        }
    };

    // Функція для оновлення абонемента
    const handleRenewSubscription = async () => {
        setConfirmModalState(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetchFunction(`api/sportscomplex/clients/${confirmModalState.clientId}/renew-subscription`, {
                method: 'put'
            });

            if (response.success) {
                notification({
                    type: 'success',
                    title: 'Успіх',
                    message: response.message,
                    placement: 'top'
                });
                closeRenewModal();
                refetch();
            }
        } catch (error) {
            notification({
                type: 'error',
                title: 'Помилка',
                message: error.message || 'Помилка при оновленні абонемента',
                placement: 'top'
            });
        } finally {
            setConfirmModalState(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        if (data && status === STATUS.SUCCESS && !isFirstRun.current) {
            refetch();
        }
        isFirstRun.current = false;
    }, [state.sendData, refetch]);

    if (status === STATUS.ERROR) {
        return <PageError title="Схоже, виникла проблема із завантаженням даних." statusError="500" />;
    }

    return (
        <>
            {status === STATUS.PENDING && isFirstRun.current ? (
                <SkeletonPage />
            ) : (
                <div className={classNames("page", { "page--overlay": state.isOpen })}>
                    <div className="page__header">
                        <h2 className="title title--md">Клієнти</h2>
                        <div className="btn-group">
                            <Button onClick={openCreateModal}>
                                {addIcon}
                                Додати клієнта
                            </Button>
                            <Button 
                                className={`btn--filter ${state.isOpen ? "btn--filter-active" : ""}`} 
                                onClick={filterHandleClick}
                            >
                                {filterIcon}
                            </Button>
                            <Dropdown 
                                dropDownIcon={dropDownIcon} 
                                textDropDown={state.sendData.limit} 
                                itemMenu={itemMenu} 
                                style={dropDownStyle} 
                                childStyle={childDropDownStyle} 
                            />
                        </div>
                    </div>
                    <div className="page__content">
                        <div className="table-data">
                            <Table 
                                loading={status === STATUS.PENDING} 
                                columns={columns} 
                                dataSource={status === STATUS.SUCCESS ? tableData : []}
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
                        className={transitionState === 'entered' ? 'modal--active' : ''}
                        onClose={closeCreateModal}
                        nodeRef={addFormRef}
                    >
                        <div className="modal__header">
                            <h3 className="title title--md">Додати клієнта</h3>
                        </div>
                        <div className="modal__content">
                            <FormItem label="ПІБ клієнта*">
                                <Input
                                    name="name"
                                    placeholder="Введіть ПІБ"
                                    value={createModalState.formData.name}
                                    onChange={onCreateFormChange}
                                />
                            </FormItem>
                            <FormItem label="Номер абонемента*">
                                <Input
                                    name="membership_number"
                                    placeholder="Номер абонемента"
                                    value={createModalState.formData.membership_number}
                                    onChange={onCreateFormChange}
                                />
                            </FormItem>
                            <FormItem label="Номер телефону*">
                                <Input
                                    name="phone_number"
                                    placeholder="Введіть номер телефону"
                                    value={createModalState.formData.phone_number}
                                    onChange={onCreateFormChange}
                                />
                            </FormItem>
                            <FormItem label="Тривалість абонемента*">
                                <Input
                                    name="subscription_duration"
                                    placeholder="Введіть тривалість"
                                    value={createModalState.formData.subscription_duration}
                                    onChange={onCreateFormChange}
                                />
                            </FormItem>
                            <FormItem label="Послуга">
                                <Input
                                    name="service_name"
                                    placeholder="Назва послуги (необов'язково)"
                                    value={createModalState.formData.service_name}
                                    onChange={onCreateFormChange}
                                />
                            </FormItem>
                        </div>
                        <div className="modal__footer">
                            <div className="btn-group">
                                <Button 
                                    onClick={handleCreateFormSubmit}
                                    loading={createModalState.loading}
                                >
                                    Зберегти
                                </Button>
                                <Button 
                                    className="btn--secondary" 
                                    onClick={closeCreateModal}
                                >
                                    Скасувати
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно для редагування клієнта */}
            <Transition in={editModalState.isOpen} timeout={200} unmountOnExit nodeRef={editFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? 'modal--active' : ''}
                        onClose={closeEditModal}
                        nodeRef={editFormRef}
                    >
                        <div className="modal__header">
                            <h3 className="title title--md">Редагувати клієнта</h3>
                        </div>
                        <div className="modal__content">
                            <FormItem label="ПІБ клієнта*">
                                <Input
                                    name="name"
                                    placeholder="Введіть ПІБ"
                                    value={editModalState.formData.name}
                                    onChange={onEditFormChange}
                                />
                            </FormItem>
                            <FormItem label="Номер абонемента*">
                                <Input
                                    name="membership_number"
                                    placeholder="Номер абонемента"
                                    value={editModalState.formData.membership_number}
                                    onChange={onEditFormChange}
                                />
                            </FormItem>
                            <FormItem label="Номер телефону*">
                                <Input
                                    name="phone_number"
                                    placeholder="Введіть номер телефону"
                                    value={editModalState.formData.phone_number}
                                    onChange={onEditFormChange}
                                />
                            </FormItem>
                            <FormItem label="Тривалість абонемента*">
                                <Input
                                    name="subscription_duration"
                                    placeholder="Введіть тривалість"
                                    value={editModalState.formData.subscription_duration}
                                    onChange={onEditFormChange}
                                />
                            </FormItem>
                            <FormItem label="Послуга">
                                <Input
                                    name="service_name"
                                    placeholder="Назва послуги"
                                    value={editModalState.formData.service_name}
                                    onChange={onEditFormChange}
                                />
                            </FormItem>
                        </div>
                        <div className="modal__footer">
                            <div className="btn-group">
                                <Button 
                                    onClick={handleEditFormSubmit}
                                    loading={editModalState.loading}
                                >
                                    Зберегти зміни
                                </Button>
                                <Button 
                                    className="btn--secondary" 
                                    onClick={closeEditModal}
                                >
                                    Скасувати
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>

            {/* Модальне вікно підтвердження оновлення абонемента */}
            <Transition in={confirmModalState.isOpen} timeout={200} unmountOnExit nodeRef={confirmFormRef}>
                {transitionState => (
                    <Modal
                        className={transitionState === 'entered' ? 'modal--active' : ''}
                        onClose={closeRenewModal}
                        nodeRef={confirmFormRef}
                    >
                        <div className="modal__header">
                            <h3 className="title title--md">Підтвердження оновлення абонемента</h3>
                        </div>
                        <div className="modal__content">
                            <p>
                                Ви точно бажаєте оновити абонемент для клієнта <strong>{confirmModalState.clientName}</strong>?
                            </p>
                            <p>
                                Після підтвердження абонемент буде оновлено на 30 днів і відлік почнеться заново.
                            </p>
                        </div>
                        <div className="modal__footer">
                            <div className="btn-group">
                                <Button 
                                    onClick={handleRenewSubscription}
                                    loading={confirmModalState.loading}
                                >
                                    Так
                                </Button>
                                <Button 
                                    className="btn--secondary" 
                                    onClick={closeRenewModal}
                                >
                                    Ні
                                </Button>
                            </div>
                        </div>
                    </Modal>
                )}
            </Transition>
        </>
    );
};

export default Clients;