// Configura fecha actual como valor predeterminado en Fecha inicio
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const today = new Date().toISOString().split("T")[0];
startDateInput.value = endDateInput.value = today;
startDateInput.setAttribute("min", today);
endDateInput.setAttribute("min", today);

// Actualiza la fecha mínima permitida en Fecha fin
startDateInput.addEventListener("change", () => {
    endDateInput.setAttribute("min", startDateInput.value);
});

// Validación de Fecha fin para que sea mayor o igual a Fecha inicio
endDateInput.addEventListener("change", () => {
    if (endDateInput.value < startDateInput.value) {
        alert("La fecha fin debe ser mayor o igual a la fecha de inicio.");
        endDateInput.value = "";
    }
});

// Cálculo automático del monto total
document.getElementById("hourlyRate").addEventListener("input", calculateTotalAmount);
document.getElementById("numHours").addEventListener("input", calculateTotalAmount);

function calculateTotalAmount() {
    const hourlyRate = parseFloat(document.getElementById("hourlyRate").value) || 0;
    const numHours = parseInt(document.getElementById("numHours").value) || 0;
    const totalAmount = hourlyRate * numHours;

    document.getElementById("totalAmount").value = totalAmount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
