import { Link } from "react-router-dom";
import styles from "./HomePage.module.css";

function HomePage() {
  return (
    <main className={styles.page}>
      <nav className={styles.actions} aria-label="Main navigation">
        <Link className={styles.actionButton} to="/bindings">
          Key bindings
        </Link>
        <Link className={styles.actionButton} to="/cameras">
          Cameras
        </Link>
      </nav>
    </main>
  );
}

export default HomePage;
