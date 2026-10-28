import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { btn, btnDanger, btnLine, input } from "../utils/ui";

const Ctx = createContext(null);

// confirm(), prompt() and notify() open a dialog and return a Promise, like the browser's own popups, but styled:
//   const ok = await dialog.confirm({ title: "Delete?", danger: true });
//   const name = await dialog.prompt({ title: "Rename", defaultValue: "Old" });   // text, or null if cancelled
//   await dialog.notify({ title: "Saved" });
export const useDialog = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialog must be used inside <DialogProvider>");
  return ctx;
};

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function DialogBox({ dlg, onFinish }) {
  const boxRef = useRef(null);
  const [value, setValue] = useState(dlg.defaultValue ?? "");
  const titleId = useId();
  const textId = useId();
  const isPrompt = dlg.kind === "prompt";
  const text = value.trim();
  const canConfirm = !isPrompt || text.length > 0;

  const cancel = () => onFinish(dlg.cancelValue);
  const accept = () => {
    if (canConfirm) onFinish(isPrompt ? text : true);
  };

  useEffect(() => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // the page behind does not scroll
    const target = boxRef.current.querySelector("[data-autofocus]");
    target?.focus();
    target?.select?.();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      cancel();
      return;
    }
    if (e.key !== "Tab") return;
    const items = [...boxRef.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0],
      last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onKeyDown={onKeyDown}
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}
    >
      <div
        ref={boxRef}
        role={isPrompt ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={dlg.message ? textId : undefined}
        className="pop w-full max-w-[440px] border border-white/25 bg-[#0a0a0a] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
      >
        <h2
          id={titleId}
          className="font-display text-2xl font-semibold tracking-tight"
        >
          {dlg.title}
        </h2>
        {dlg.message && (
          <p id={textId} className="mt-2 text-mute">
            {dlg.message}
          </p>
        )}

        {isPrompt && (
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              accept();
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs text-mute">{dlg.label}</span>
              <input
                data-autofocus
                className={input}
                value={value}
                maxLength={dlg.maxLength}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
          </form>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {dlg.kind !== "notify" && (
            <button
              type="button"
              className={btnLine}
              onClick={cancel}
              data-autofocus={dlg.danger ? "" : undefined}
            >
              {dlg.cancelText || "Cancel"}
            </button>
          )}
          <button
            type="button"
            className={dlg.danger ? btnDanger : btn}
            onClick={accept}
            disabled={!canConfirm}
            data-autofocus={!isPrompt && !dlg.danger ? "" : undefined}
          >
            {dlg.confirmText || (dlg.kind === "notify" ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null);
  const current = useRef(null);
  const counter = useRef(0);

  const finish = useCallback((value) => {
    const d = current.current;
    current.current = null;
    setDlg(null);
    d?.resolve(value);
  }, []);

  const open = useCallback(
    (config) =>
      new Promise((resolve) => {
        const previous = current.current;
        previous?.resolve(previous.cancelValue); // a new dialog dismisses the old one
        const cancelValue =
          config.kind === "notify"
            ? true
            : config.kind === "prompt"
              ? null
              : false;
        const d = { ...config, resolve, cancelValue, id: ++counter.current };
        current.current = d;
        setDlg(d);
      }),
    [],
  );

  const api = useMemo(
    () => ({
      confirm: (o) => open({ kind: "confirm", ...o }),
      prompt: (o) => open({ kind: "prompt", ...o }),
      notify: (o) => open({ kind: "notify", ...o }),
    }),
    [open],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {dlg &&
        createPortal(
          <DialogBox key={dlg.id} dlg={dlg} onFinish={finish} />,
          document.body,
        )}
    </Ctx.Provider>
  );
}
