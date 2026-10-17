/**
 * Runs before first paint (inlined by the root layout): follows the device's light or dark
 * setting, live, by setting <html data-theme>. Dark is the default when it can't be read.
 */
export const THEME_BOOT_SCRIPT = `try{var m=matchMedia("(prefers-color-scheme: light)"),s=function(){document.documentElement.dataset.theme=m.matches?"light":"dark"};s();m.addEventListener("change",s)}catch(e){}`;
