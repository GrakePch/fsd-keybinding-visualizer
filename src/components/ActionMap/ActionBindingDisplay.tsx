import type { InputBinding } from "../../interfaces";
import { bindingLabel } from "./actionBinding";
import styles from "./ActionItem.module.css";

type ActionBindingDisplayProps = {
  bindings: InputBinding[];
  actionActivationMode: string;
};

const ActionBindingDisplay = ({ bindings, actionActivationMode }: ActionBindingDisplayProps) => (
  <p className={styles.kbms} title={bindings.map(bindingLabel).join("; ")}>
    {bindings.map((binding, index) => {
      const activationMode = binding.activationMode || actionActivationMode;
      return (
        <span className={styles.bindingPair} key={`${binding.rawInput}-${index}`}>
          {activationMode && <span className={styles.activationModeBadge}>{activationMode}</span>}
          <span className={styles.bindingBadge}>{bindingLabel(binding)}</span>
        </span>
      );
    })}
  </p>
);

export default ActionBindingDisplay;
