import React from 'react';
import type { LineItemFormState } from '@/types/invoice';
import { Plus, Trash2 } from 'lucide-react';

interface LineItemsTableProps {
  items: LineItemFormState[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, field: keyof LineItemFormState, value: any) => void;
  disabled?: boolean;
  currencySymbol?: string;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  disabled = false,
  currencySymbol = '$',
}) => {
  return (
    <div>
      <div className="items-table-container">
        <table className="items-table" id="line-items-table">
          <thead>
            <tr>
              <th className="col-item-num">#</th>
              <th className="col-description">
                Description <span className="required-asterisk">*</span>
              </th>
              <th className="col-qty">
                Qty <span className="required-asterisk">*</span>
              </th>
              <th className="col-price">
                Unit Price ({currencySymbol}) <span className="required-asterisk">*</span>
              </th>
              <th className="col-tax">Tax (%)</th>
              <th className="col-amount">Amount ({currencySymbol})</th>
              <th className="col-action"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const lineAmount = Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * 100) / 100;
              const taxValue = Math.round((lineAmount * (Number(item.tax_rate) || 0)) / 100 * 100) / 100;

              return (
                <tr key={item.id || index} className="line-item-row" data-row-index={index}>
                  <td className="col-item-num">{index + 1}</td>
                  
                  {/* Item Description */}
                  <td className="col-description">
                    <input
                      type="text"
                      className="form-input item-description-input"
                      placeholder="e.g. Website Design & Development"
                      value={item.description}
                      onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                      disabled={disabled}
                      required
                      id={`item-desc-${index}`}
                    />
                  </td>

                  {/* Quantity */}
                  <td className="col-qty">
                    <input
                      type="number"
                      className="form-input item-quantity-input"
                      placeholder="1"
                      min="0.001"
                      step="any"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => onUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                      required
                      id={`item-qty-${index}`}
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="col-price">
                    <input
                      type="number"
                      className="form-input item-price-input"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      value={item.unit_price === 0 ? '' : item.unit_price}
                      onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                      required
                      id={`item-price-${index}`}
                    />
                  </td>

                  {/* Tax Rate % */}
                  <td className="col-tax">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        type="number"
                        className="form-input item-tax-input"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.1"
                        value={item.tax_rate === 0 ? '' : item.tax_rate}
                        onChange={(e) => onUpdateItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        id={`item-tax-${index}`}
                      />
                      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                        {[0, 5, 12, 18, 28].map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => onUpdateItem(index, 'tax_rate', rate)}
                            disabled={disabled}
                            style={{
                              fontSize: '0.65rem',
                              padding: '1px 3px',
                              background: item.tax_rate === rate ? 'var(--primary-100)' : 'var(--slate-100)',
                              color: item.tax_rate === rate ? 'var(--primary-700)' : 'var(--slate-600)',
                              border: item.tax_rate === rate ? '1px solid var(--primary-300)' : '1px solid var(--slate-200)',
                              borderRadius: '3px',
                              fontWeight: item.tax_rate === rate ? 700 : 500,
                            }}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Computed Line Amount */}
                  <td className="col-amount">
                    <div className="line-amount-text" id={`item-amount-${index}`}>
                      {currencySymbol}{lineAmount.toFixed(2)}
                    </div>
                    {item.tax_rate > 0 && (
                      <div className="tax-badge" style={{ float: 'right' }}>
                        +{currencySymbol}{taxValue.toFixed(2)} tax
                      </div>
                    )}
                  </td>

                  {/* Delete Action */}
                  <td className="col-action">
                    <button
                      type="button"
                      className="btn-delete-row"
                      onClick={() => onRemoveItem(index)}
                      disabled={disabled || items.length <= 1}
                      title={items.length <= 1 ? 'An invoice must have at least one line item' : 'Remove item'}
                      id={`btn-remove-item-${index}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-footer-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onAddItem}
          disabled={disabled}
          id="btn-add-line-item"
        >
          <Plus size={16} /> Add Line Item
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
          {items.length} {items.length === 1 ? 'item' : 'items'} in invoice
        </span>
      </div>
    </div>
  );
};
