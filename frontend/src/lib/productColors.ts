// Product Color Mapping Utility
// Maps product names to their Tailwind color classes
// OFFICIAL COLORS - See SVILUPPO/RULES.md for reference
// Source of truth: frontend/tailwind.config.js (lines 44-64)

export const PRODUCT_COLORS = {
    'Granpollo': {
        bright: 'bg-granpollo-bright text-white',
        pastel: 'bg-granpollo-pastel',
        border: 'border-granpollo-bright',
    },
    'Pollo70': {
        bright: 'bg-pollo70-bright text-white',
        pastel: 'bg-pollo70-pastel',
        border: 'border-pollo70-bright',
    },
    'Color Yeald': {
        bright: 'bg-colorYeald-bright text-white',
        pastel: 'bg-colorYeald-pastel',
        border: 'border-colorYeald-bright',
    },
    'Ross': {
        bright: 'bg-ross-bright text-white',
        pastel: 'bg-ross-pastel',
        border: 'border-ross-bright',
    },
} as const;

export type ProductName = keyof typeof PRODUCT_COLORS;

/**
 * Get the pastel background color class for a product
 */
export function getProductPastelBg(prodotto: string): string {
    const normalized = prodotto.trim();
    if (normalized in PRODUCT_COLORS) {
        return PRODUCT_COLORS[normalized as ProductName].pastel;
    }
    return 'bg-gray-50'; // fallback
}

/**
 * Get the bright background color class for a product
 */
export function getProductBrightBg(prodotto: string): string {
    const normalized = prodotto.trim();
    if (normalized in PRODUCT_COLORS) {
        return PRODUCT_COLORS[normalized as ProductName].bright;
    }
    return 'bg-gray-500 text-white'; // fallback
}

/**
 * Get the border color class for a product
 */
export function getProductBorder(prodotto: string): string {
    const normalized = prodotto.trim();
    if (normalized in PRODUCT_COLORS) {
        return PRODUCT_COLORS[normalized as ProductName].border;
    }
    return 'border-gray-300'; // fallback
}
