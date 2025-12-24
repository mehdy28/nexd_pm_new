import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export const generateClientKey = (prefix = '') => {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
