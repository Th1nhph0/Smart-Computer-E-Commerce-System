document.addEventListener('DOMContentLoaded', function () {
    fetchClusterData();
});

async function fetchClusterData() {
    try {
        const response = await fetch('https://localhost:7068/api/Analytics/CustomerSegments?k=3');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        
        if (data.message) {
            document.getElementById('clusterTableBody').innerHTML = `<tr><td colspan="5" class="text-center">${data.message}</td></tr>`;
            return;
        }

        // Update KPI
        document.getElementById('totalCustomers').innerText = data.totalCustomersAnalyzed;
        document.getElementById('kValue').innerText = data.k;

        renderTable(data.segments);
        renderCharts(data.segments);

    } catch (error) {
        console.error('Error fetching cluster data:', error);
        document.getElementById('clusterTableBody').innerHTML = '<tr><td colspan="5" class="text-center text-danger">Lỗi khi tải dữ liệu. Vui lòng đảm bảo Backend đang chạy.</td></tr>';
    }
}

function renderTable(segments) {
    const tbody = document.getElementById('clusterTableBody');
    tbody.innerHTML = '';

    const badgeColors = ['bg-label-primary', 'bg-label-success', 'bg-label-warning', 'bg-label-info'];

    segments.forEach((seg, index) => {
        const colorClass = badgeColors[index % badgeColors.length];
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${seg.clusterName}</strong></td>
            <td>${seg.customerCount} Khách hàng</td>
            <td>${seg.averageOrderCount.toFixed(2)} đơn</td>
            <td>${formatCurrency(seg.averageTotalSpend)}</td>
            <td><span class="badge ${colorClass} me-1">Cluster ${seg.clusterId}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function renderCharts(segments) {
    const labels = segments.map(s => s.clusterName);
    const customerCounts = segments.map(s => s.customerCount);
    const avgSpends = segments.map(s => s.averageTotalSpend);
    const avgOrders = segments.map(s => s.averageOrderCount);

    const colors = ['#696cff', '#71dd37', '#ffab00', '#03c3ec'];

    // Pie Chart
    const ctxPie = document.getElementById('clusterPieChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: customerCounts,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    // Bar Chart
    const ctxBar = document.getElementById('clusterBarChart').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Trung bình Đơn hàng',
                    data: avgOrders,
                    backgroundColor: 'rgba(105, 108, 255, 0.7)',
                    borderColor: '#696cff',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Trung bình Chi tiêu (triệu VNĐ)',
                    data: avgSpends.map(s => s / 1000000), // Convert to millions for scale
                    backgroundColor: 'rgba(113, 221, 55, 0.7)',
                    borderColor: '#71dd37',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Số Đơn Hàng' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Chi Tiêu (Triệu VNĐ)' }
                }
            }
        }
    });
}
