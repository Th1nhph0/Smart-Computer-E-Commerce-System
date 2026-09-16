document.addEventListener('DOMContentLoaded', function () {
    fetchAprioriData();
});

async function fetchAprioriData() {
    try {
        const response = await fetch('https://localhost:7068/api/Analytics/ProductAssociations?minSupport=0.05&minConfidence=0.3');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.message) {
            document.getElementById('rulesTableBody').innerHTML = `<tr><td colspan="4" class="text-center">${data.message}</td></tr>`;
            return;
        }

        // Update KPI
        document.getElementById('totalTransactions').innerText = data.totalTransactions;
        document.getElementById('rulesGenerated').innerText = data.rulesGenerated;

        renderRulesTable(data.rules);

    } catch (error) {
        console.error('Error fetching Apriori data:', error);
        document.getElementById('rulesTableBody').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Lỗi khi tải dữ liệu. Vui lòng đảm bảo Backend đang chạy.</td></tr>';
    }
}

function renderRulesTable(rules) {
    const tbody = document.getElementById('rulesTableBody');
    tbody.innerHTML = '';

    if (rules.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Không tìm thấy luật kết hợp nào thỏa mãn điều kiện.</td></tr>';
        return;
    }

    rules.forEach((rule, index) => {
        let tr = document.createElement('tr');
        
        // Convert to percentage
        const confPercent = (rule.confidence * 100).toFixed(1);
        const suppPercent = (rule.support * 100).toFixed(1);
        
        // Progress bar colors based on value
        const confColor = rule.confidence > 0.8 ? 'bg-success' : (rule.confidence > 0.5 ? 'bg-primary' : 'bg-warning');
        const suppColor = rule.support > 0.4 ? 'bg-success' : (rule.support > 0.2 ? 'bg-primary' : 'bg-info');

        tr.innerHTML = `
            <td>
                <strong>${rule.productName}</strong><br>
                <small class="text-muted">ID: ${rule.productId}</small>
            </td>
            <td>
                <span class="badge bg-label-primary"><i class="bx bx-right-arrow-alt"></i> Mua kèm</span><br>
                <strong>${rule.recommendedProductName}</strong><br>
                <small class="text-muted">ID: ${rule.recommendedProductId}</small>
            </td>
            <td>
                <div class="d-flex justify-content-between align-items-center gap-3">
                    <div class="progress w-100" style="height: 8px;">
                        <div class="progress-bar ${confColor}" role="progressbar" style="width: ${confPercent}%" aria-valuenow="${confPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small class="fw-semibold">${confPercent}%</small>
                </div>
            </td>
            <td>
                <div class="d-flex justify-content-between align-items-center gap-3">
                    <div class="progress w-100" style="height: 8px;">
                        <div class="progress-bar ${suppColor}" role="progressbar" style="width: ${suppPercent}%" aria-valuenow="${suppPercent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small class="fw-semibold">${suppPercent}%</small>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
