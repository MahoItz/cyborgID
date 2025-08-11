async function checkKeys() {
  try {
    const res = await fetch("/api/checkKeys");
    const data = await res.json();
    document.getElementById("keysResult").textContent = JSON.stringify(
      data,
      null,
      2
    );
  } catch (err) {
    document.getElementById("keysResult").textContent = err.message;
  }
}

async function checkModels() {
  try {
    const res = await fetch("/api/checkModels");
    const data = await res.json();
    const lines = Object.entries(data).map(([model, info]) => {
      if (info.available) {
        return `${model}: ok`;
      }
      return `${model}: error - ${info.error || "unknown"}`;
    });
    document.getElementById("modelsResult").textContent = lines.join("\n");
  } catch (err) {
    document.getElementById("modelsResult").textContent = err.message;
  }
}

document.getElementById("checkKeysBtn").addEventListener("click", checkKeys);
document.getElementById("checkModelsBtn").addEventListener("click", checkModels);
