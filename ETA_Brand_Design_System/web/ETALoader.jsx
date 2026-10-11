import "./eta-loader.css";

export default function ETALoader({ theme = "dark" }) {
  const src =
    theme === "light"
      ? "/brand/eta-mark-light.png"
      : "/brand/eta-mark-dark.png";

  return (
    <div className="eta-loader" role="status"
         aria-label="Loading Exploratory Training Academy">
      <img src={src} alt="" />
    </div>
  );
}
