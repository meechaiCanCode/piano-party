import styles from "./index.module.css"

export default function Home() {
  return (
      <main>
      <div className={styles.content}>
        <img src="/images/logo-text-blue.svg" alt="Piano Party" />
        <h1>Welcome to piano party!</h1>
        <p>Learning sight-reading by playing music on your keyboard!</p>
      </div>
      </main>
  );
}
