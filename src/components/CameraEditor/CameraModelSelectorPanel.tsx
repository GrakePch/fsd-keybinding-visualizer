import { useMemo, useState } from "react";
import type { SelectableVehicleModel } from "../../types/vehicleModel";
import { useSelectableVehicleModels } from "../../utils/vehicleModelManifest";
import styles from "./CameraModelSelectorPanel.module.css";

interface CameraModelSelectorPanelProps {
  selectedModel: SelectableVehicleModel | null;
  previewModel: SelectableVehicleModel | null;
  onPreviewModel: (model: SelectableVehicleModel) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function CameraModelSelectorPanel({ selectedModel, previewModel, onPreviewModel, onConfirm, onCancel }: CameraModelSelectorPanelProps) {
  const { loaded, models, error } = useSelectableVehicleModels();
  const [query, setQuery] = useState("");

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return models;

    return models.filter((model) => {
      const haystack = [model.displayName, model.className, model.rsiName, model.slug].filter(Boolean).join(" ").toLocaleLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [models, query]);

  const activeModel = previewModel || selectedModel;

  return (
    <aside className={styles.panel} aria-label="Vehicle model selector">
      <label className={styles.searchLabel}>
        <span>Search model</span>
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ship name, class name, or slug" />
      </label>

      <div className={styles.statusRow}>
        {!loaded && <span>Loading vehicle manifest…</span>}
        {loaded && error && <span>Model manifest unavailable: {error}</span>}
        {loaded && !error && <span>{filteredModels.length} / {models.length} models</span>}
      </div>

      <div className={styles.modelList}>
        {filteredModels.map((model) => (
          <button
            className={`${styles.modelButton} ${activeModel?.slug === model.slug ? `${styles.modelButtonActive} buttonHighlighted` : ""}`}
            key={model.slug}
            type="button"
            onClick={() => onPreviewModel(model)}
          >
            <span className={styles.modelName}>{model.displayName}</span>
            <span className={styles.modelMeta}>{model.className || model.slug}</span>
          </button>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button className="buttonAccent" type="button" onClick={onConfirm} disabled={!previewModel}>Confirm model</button>
      </div>
    </aside>
  );
}

export default CameraModelSelectorPanel;
