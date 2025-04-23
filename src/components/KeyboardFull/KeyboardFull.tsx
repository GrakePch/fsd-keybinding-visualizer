import { layoutKB } from "../../utils/layout";
import KeyKB from "../KeyKB/KeyKB";
import "./KeyboardFull.css";

const KeyboardFull = () => {
  return (
    <div className="KeyboardFull">
      {layoutKB.map((line, idx) => (
        <div className="line" key={idx}>
          {line.map((keyInfo, idx2) => {
            let keyId, w, h;
            if (typeof keyInfo === "string") {
              keyId = keyInfo;
              w = 1;
              h = 1;
            } else {
              [keyId, w, h] = keyInfo;
            }
            return <KeyKB key={idx2} keyId={keyId} widthX={w} heightX={h} />;
          })}
        </div>
      ))}
    </div>
  );
};

export default KeyboardFull;
