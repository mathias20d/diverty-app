import { useEffect } from 'react';

// Keyboard changes resize the visual viewport on phones, not always the layout viewport.
// Update only this dialog's geometry; typing and keyboard animation don't render the app.
export function useReservationViewport(dialogRef, scrollRef) {
    useEffect(() => {
        const dialog = dialogRef.current;
        const scroller = scrollRef.current;
        if (!dialog || !scroller) return;
        const viewport = window.visualViewport;
        let baselineHeight = window.innerHeight;
        let frame = 0;
        let focusTimer = 0;

        const activeInput = () => {
            const element = document.activeElement;
            return dialog.contains(element) && element.matches('textarea, input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"])') && !element.readOnly && !element.disabled ? element : null;
        };
        const update = () => {
            frame = 0;
            // Preserve native pinch zoom and panning. Mobile fields use 16px to avoid iOS auto zoom.
            if (viewport && Math.abs(viewport.scale - 1) > 0.02) return;
            const height = viewport?.height || window.innerHeight;
            const input = activeInput();
            if (!input) baselineHeight = window.innerHeight;
            const mobile = window.matchMedia('(max-width: 639px), (pointer: coarse)').matches;
            dialog.style.setProperty('--reservation-viewport-height', `${height}px`);
            dialog.style.setProperty('--reservation-viewport-top', `${viewport?.offsetTop || 0}px`);
            dialog.dataset.keyboardOpen = String(mobile && !!input && Math.max(baselineHeight, window.innerHeight) - height > 100);
            if (!input) return;

            const area = scroller.getBoundingClientRect();
            const field = input.getBoundingClientRect();
            const label = input.parentElement?.querySelector('label');
            const fieldTop = label ? Math.min(label.getBoundingClientRect().top, field.top) : field.top;
            const footer = dialog.querySelector('.reservation-actions');
            const footerHeight = footer && getComputedStyle(footer).position === 'sticky' ? footer.getBoundingClientRect().height : 0;
            const top = area.top + 12;
            const bottom = area.bottom - footerHeight - 12;
            // Scroll just this form, and only as far as necessary to expose the input and label.
            let delta = 0;
            if (fieldTop < top || field.bottom - fieldTop > bottom - top) delta = fieldTop - top;
            else if (field.bottom > bottom) delta = field.bottom - bottom;
            if (Math.abs(delta) > 1) scroller.scrollTop += delta;
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        const onFocus = () => {
            schedule();
            clearTimeout(focusTimer);
            focusTimer = setTimeout(schedule, 250);
        };
        viewport?.addEventListener('resize', schedule);
        viewport?.addEventListener('scroll', schedule);
        window.addEventListener('resize', schedule);
        dialog.addEventListener('focusin', onFocus);
        dialog.addEventListener('focusout', schedule);
        update();

        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(focusTimer);
            viewport?.removeEventListener('resize', schedule);
            viewport?.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            dialog.removeEventListener('focusin', onFocus);
            dialog.removeEventListener('focusout', schedule);
        };
    }, [dialogRef, scrollRef]);
}
