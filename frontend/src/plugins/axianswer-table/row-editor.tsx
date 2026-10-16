import { useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { fetchGuiColumnInfo, writeGuiRow, type GuiColumnInfo, type GuiTableInfo } from "@/api/gui-table-api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function RowEditor({ table, original, onClose, onSaved }: {
  table: GuiTableInfo;
  original: Record<string, string | null> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [columns, setColumns] = useState<GuiColumnInfo[] | null>(null);
  const [values, setValues] = useState<Record<string, string | null>>(original ?? {});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetchGuiColumnInfo(table).then((result) => { if (!cancelled) setColumns(result); })
      .catch((failure: Error) => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [table]);

  async function save(action: "insert" | "update" | "delete") {
    if (!columns || busy) return;
    const writable = Object.fromEntries(columns.filter((column) => !column.is_read_only &&
      (!original || column.column_name !== table.key_column) && column.column_name in values)
      .map((column) => [column.column_name, values[column.column_name]]));
    setBusy(true);
    setError("");
    try {
      await writeGuiRow(table, action, original?.[table.key_column ?? ""] ?? null, writable, original ?? {});
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-2xl" onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{original ? "Edit server" : "Add server"}</DialogTitle>
          <DialogDescription>{table.schema}.{table.table}</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!columns && !error && <p role="status">Loading fields...</p>}
        {confirmDelete ? <p role="alert">Permanently delete this server configuration? This cannot be undone.</p> : (
          <form id="server-editor" className="flex min-h-0 flex-col gap-4 overflow-auto px-1" onSubmit={(event) => { event.preventDefault(); void save(original ? "update" : "insert"); }}>
            {columns?.map((column) => {
              const name = column.column_name;
              const readOnly = column.is_read_only || (!!original && name === table.key_column);
              const value = values[name];
              return (
                <fieldset key={name} disabled={busy || readOnly} className="flex flex-col gap-1.5">
                  <label htmlFor={`field-${name}`} className="text-sm font-medium break-words">{name}</label>
                  <div className="flex items-center gap-3">
                    {column.data_type === "bit" ? (
                      <Checkbox id={`field-${name}`} aria-label={name} disabled={value === null} checked={value === "true" || value === "1"}
                        onCheckedChange={(checked) => setValues((current) => ({ ...current, [name]: checked ? "1" : "0" }))} />
                    ) : (
                      <Input id={`field-${name}`} disabled={value === null} value={value ?? ""} placeholder={readOnly ? "Generated" : column.data_type}
                        onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} />
                    )}
                    {column.is_nullable && !readOnly && <label className="flex shrink-0 items-center gap-2 text-xs"><Checkbox checked={value === null}
                      onCheckedChange={(checked) => setValues((current) => ({ ...current, [name]: checked ? null : "" }))} />NULL</label>}
                  </div>
                </fieldset>
              );
            })}
          </form>
        )}
        <DialogFooter className="flex-wrap gap-2">
          {original && <Button variant="destructive" disabled={busy || !columns} onClick={() => confirmDelete ? void save("delete") : setConfirmDelete(true)}><Trash2 data-icon="inline-start" />{confirmDelete ? "Confirm delete" : "Delete server"}</Button>}
          <Button variant="outline" disabled={busy} onClick={() => confirmDelete ? setConfirmDelete(false) : onClose()}>Cancel</Button>
          {!confirmDelete && <Button type="submit" form="server-editor" disabled={busy || !columns}><Save data-icon="inline-start" />{busy ? "Saving..." : "Save"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}