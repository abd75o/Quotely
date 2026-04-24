"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Props {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  taxRate: 10 | 20;
  onTaxRateChange: (rate: 10 | 20) => void;
}

function addItem(items: LineItem[]): LineItem[] {
  return [
    ...items,
    { id: `item-${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 },
  ];
}

function updateItem(items: LineItem[], id: string, patch: Partial<LineItem>): LineItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    const updated = { ...item, ...patch };
    updated.total = Math.round(updated.quantity * updated.unitPrice * 100) / 100;
    return updated;
  });
}

function removeItem(items: LineItem[], id: string): LineItem[] {
  return items.filter((i) => i.id !== id);
}

export function LineItemsEditor({ items, onChange, taxRate, onTaxRateChange }: Props) {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[1fr_80px_120px_100px_36px] gap-2 px-3 mb-2">
        {["Prestation / Description", "Qté", "Prix unit. HT", "Total HT", ""].map((h) => (
          <span key={h} className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid grid-cols-[20px_1fr] sm:grid-cols-[20px_1fr_80px_120px_100px_36px] gap-2 items-center p-2 bg-white rounded-xl border border-[var(--border)] hover:border-gray-300 transition-colors group"
          >
            {/* Drag handle */}
            <GripVertical className="w-4 h-4 text-[var(--text-muted)] cursor-grab hidden sm:block" />

            {/* Description */}
            <input
              type="text"
              value={item.description}
              onChange={(e) => onChange(updateItem(items, item.id, { description: e.target.value }))}
              placeholder={`Prestation ${index + 1}…`}
              aria-label={`Description prestation ${index + 1}`}
              className="w-full px-2 py-2 text-sm bg-transparent border-0 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)] col-span-1"
            />

            {/* Mobile: second row */}
            <div className="col-span-2 sm:hidden grid grid-cols-3 gap-2 mt-1">
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Qté</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={item.quantity}
                  onChange={(e) => onChange(updateItem(items, item.id, { quantity: parseFloat(e.target.value) || 0 }))}
                  aria-label="Quantité"
                  className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-center"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Prix HT (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => onChange(updateItem(items, item.id, { unitPrice: parseFloat(e.target.value) || 0 }))}
                  aria-label="Prix unitaire"
                  className="w-full px-2 py-1.5 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] text-right"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] mb-1 block">Total</label>
                <div className="px-2 py-1.5 text-sm font-semibold text-[var(--text-primary)] text-right">
                  {fmt(item.total)} €
                </div>
              </div>
            </div>

            {/* Desktop: quantity */}
            <input
              type="number"
              min="0"
              step="0.5"
              value={item.quantity}
              onChange={(e) => onChange(updateItem(items, item.id, { quantity: parseFloat(e.target.value) || 0 }))}
              aria-label="Quantité"
              className="hidden sm:block px-2 py-2 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 text-center w-full"
            />

            {/* Desktop: unit price */}
            <div className="hidden sm:flex items-center border border-[var(--border)] rounded-lg overflow-hidden focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20">
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unitPrice}
                onChange={(e) => onChange(updateItem(items, item.id, { unitPrice: parseFloat(e.target.value) || 0 }))}
                aria-label="Prix unitaire HT"
                className="flex-1 px-2 py-2 text-sm outline-none text-right bg-transparent w-full"
              />
              <span className="px-2 text-xs text-[var(--text-muted)] bg-gray-50 border-l border-[var(--border)] py-2">€</span>
            </div>

            {/* Desktop: total */}
            <div className="hidden sm:block px-2 py-2 text-sm font-semibold text-[var(--text-primary)] text-right">
              {fmt(item.total)} €
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onChange(removeItem(items, item.id))}
              disabled={items.length <= 1}
              aria-label="Supprimer la ligne"
              className={cn(
                "p-1.5 rounded-lg cursor-pointer transition-colors",
                items.length > 1
                  ? "text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50"
                  : "text-[var(--border)] cursor-not-allowed"
              )}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add line */}
      <button
        type="button"
        onClick={() => onChange(addItem(items))}
        className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary-bg)] rounded-xl border border-dashed border-[var(--primary)]/40 hover:border-[var(--primary)] w-full justify-center cursor-pointer transition-all duration-150"
      >
        <Plus className="w-4 h-4" />
        Ajouter une ligne
      </button>

      {/* TVA + Totals */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-start">
        {/* TVA selector */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
            Taux de TVA
          </label>
          <div className="flex gap-2">
            {([10, 20] as const).map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => onTaxRateChange(rate)}
                className={cn(
                  "px-4 py-2 text-sm font-semibold rounded-xl border cursor-pointer transition-all duration-150",
                  taxRate === rate
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                    : "bg-white text-[var(--text-secondary)] border-[var(--border)] hover:border-gray-300"
                )}
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="w-full sm:w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Sous-total HT</span>
            <span className="font-medium text-[var(--text-primary)] tabular-nums">{fmt(subtotal)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--text-secondary)]">TVA ({taxRate}%)</span>
            <span className="font-medium text-[var(--text-primary)] tabular-nums">{fmt(taxAmount)} €</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-[var(--border)]">
            <span className="text-[var(--text-primary)]">Total TTC</span>
            <span className="text-[var(--primary)] tabular-nums">{fmt(total)} €</span>
          </div>
        </div>
      </div>
    </div>
  );
}
