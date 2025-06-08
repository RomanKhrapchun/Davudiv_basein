// FilterDropdown.jsx - новий компонент dropdown фільтра

import React, { useRef, useEffect } from 'react';
import Input from "../Input/Input";
import Button from "../Button/Button";

const FilterDropdown = ({ 
    isOpen, 
    onClose, 
    filterData, 
    onFilterChange, 
    onApplyFilter, 
    onResetFilters, 
    searchIcon 
}) => {
    const dropdownRef = useRef(null);

    // Закриття по кліку поза межами
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Закриття по Escape
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="filter-dropdown" ref={dropdownRef}>
            {/* Стрілочка що вказує на кнопку */}
            <div className="filter-dropdown__arrow"></div>
            
            {/* Контент фільтра */}
            <div className="filter-dropdown__content">
                <div className="filter-dropdown__header">
                    <h3 className="filter-dropdown__title">Фільтри</h3>
                    <button 
                        className="filter-dropdown__close"
                        onClick={onClose}
                        title="Закрити"
                    >
                        ✕
                    </button>
                </div>

                <div className="filter-dropdown__body">
                    {/* Поле для пошуку по прізвищу */}
                    <div className="filter-dropdown__item">
                        <Input
                            icon={searchIcon}
                            name="title"
                            type="text"
                            placeholder="Введіть прізвище"
                            value={filterData?.title || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поле для ІПН */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">ІПН</label>
                        <Input
                            icon={searchIcon}
                            name="identification"
                            type="text"
                            minLength="3"
                            placeholder="Введіть 3 останні цифри ІПН"
                            value={filterData?.identification || ''}
                            onChange={onFilterChange}
                        />
                    </div>

                    {/* Поля для суми боргу */}
                    <div className="filter-dropdown__item">
                        <label className="filter-dropdown__label">Сума боргу (₴)</label>
                        
                        <div className="filter-dropdown__sublabel">
                            Діапазон від ₴ до ₴
                        </div>
                        <div className="filter-dropdown__range">
                            <Input
                                icon={searchIcon}
                                name="debt_amount_min"
                                type="number"
                                step="0.01"
                                placeholder="Від"
                                value={filterData?.debt_amount_min || ''}
                                onChange={onFilterChange}
                            />
                            <span className="filter-dropdown__range-separator">-</span>
                            <Input
                                icon={searchIcon}
                                name="debt_amount_max"
                                type="number"
                                step="0.01"
                                placeholder="До"
                                value={filterData?.debt_amount_max || ''}
                                onChange={onFilterChange}
                            />
                        </div>

                        {/* Точна сума */}
                        <div className="filter-dropdown__sublabel">
                            Точна сума боргу (₴)
                        </div>
                        <Input
                            icon={searchIcon}
                            name="debt_amount"
                            type="number"
                            step="0.01"
                            placeholder="Напр. 5000"
                            value={filterData?.debt_amount || ''}
                            onChange={onFilterChange}
                        />
                    </div>
                </div>

                {/* Кнопки дій */}
                <div className="filter-dropdown__footer">
                    <Button 
                        className="filter-dropdown__apply"
                        onClick={onApplyFilter}
                    >
                        Застосувати
                    </Button>
                    <Button 
                        className="filter-dropdown__reset"
                        onClick={onResetFilters}
                    >
                        Скинути
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default FilterDropdown;