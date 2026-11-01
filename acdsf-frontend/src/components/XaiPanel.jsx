export default function XaiPanel() {
  return (
    <div className="section">
      <h2>Explainable AI</h2>

      <h3>SHAP — Attack Classification Explanation</h3>
      <img src="/shap_explanation.png" alt="SHAP explanation" className="topology-img"
           onError={(e) => (e.target.style.display = "none")} />
      <p className="hint">Copy shap_explanation.png from your member4 folder into public/ if this is blank.</p>

      <h3>Red Team RL Agent — Training Progress</h3>
      <img src="/red_agent_training_curve.png" alt="RL training curve" className="topology-img"
           onError={(e) => (e.target.style.display = "none")} />
      <p className="hint">Copy red_agent_training_curve.png from your member2 folder into public/ if this is blank.</p>
    </div>
  );
}
