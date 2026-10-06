document.addEventListener('DOMContentLoaded', async () => {
    const txtDoanhThu = document.getElementById('txtTongDoanhThu');
    const txtDonHang = document.getElementById('txtTongDonHang');
    const tableBody = document.getElementById('dashboardOrderTableBody');
    const filterSelect = document.getElementById('filterChartType');

    const lblChoXuLy = document.getElementById('countChoXuLy');
    const lblDaDuyet = document.getElementById('countDaDuyet');
    const lblDangLam = document.getElementById('countDangLam');
    const lblHoanThanh = document.getElementById('countHoanThanh');
    const lblDaHuy = document.getElementById('countDaHuy');
    const lblDaGiao = document.getElementById('countDaGiao');

    if (!tableBody) return;

    let revenueChart = null;
    let validOrders = [];

    function normalizeToYMD(dateStr) {
        if (!dateStr) return '';
        try {
            let pureDate = dateStr.split('T')[0].split(' ')[0].trim();
            if (pureDate.includes('-') && pureDate.indexOf('-') === 4) return pureDate;
            if (pureDate.includes('/') && pureDate.indexOf('/') === 4) return pureDate.replace(/\//g, '-');
            return pureDate;
        } catch (e) {
            return '';
        }
    }

    try {
        const response = await fetch(`${API_URL}/api/Orders`);
        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-3">❌ Lỗi phản hồi từ API Server!</td></tr>`;
            return;
        }

        let orders = await response.json();
        // Handle ASP.NET Core ReferenceHandler.Preserve format
        if (orders && orders.$values) {
            orders = orders.$values;
        }

        let tongDoanhThuThucTe = 0;
        let tongSoLuongDonHang = orders.length;

        let vChoXuLy = 0; let vDaDuyet = 0; let vDangLam = 0;
        let vHoanThanh = 0; let vDaHuy = 0; let vDaGiao = 0;

        if (Array.isArray(orders)) {
            orders.forEach(dh => {
            const trangThai = (dh.orderStatus || 'Chờ xử lý').trim();
            const soTien = dh.totalAmount || 0;

            const lowerStatus = trangThai.toLowerCase();
            
            if (lowerStatus.includes('hủy')) {
                vDaHuy++;
            } else {
                if (lowerStatus.includes('giao') || lowerStatus.includes('thanh toán')) {
                    vDaGiao++;
                    tongDoanhThuThucTe += soTien;
                    validOrders.push(dh);
                } else if (lowerStatus.includes('hoàn thành')) {
                    vHoanThanh++;
                    tongDoanhThuThucTe += soTien;
                    validOrders.push(dh);
                } else if (lowerStatus.includes('chờ')) {
                    vChoXuLy++;
                } else if (lowerStatus.includes('duyệt')) {
                    vDaDuyet++;
                } else if (lowerStatus.includes('làm') || lowerStatus.includes('chuẩn bị') || lowerStatus.includes('ráp')) {
                    vDangLam++;
                } else {
                    vChoXuLy++;
                }
            } // Added missing closing brace
            });
        }

        if (txtDoanhThu) txtDoanhThu.innerText = new Intl.NumberFormat('vi-VN').format(tongDoanhThuThucTe) + ' đ';
        if (txtDonHang) txtDonHang.innerText = new Intl.NumberFormat('vi-VN').format(tongSoLuongDonHang) + ' đơn';

        if (lblChoXuLy) lblChoXuLy.innerText = vChoXuLy;
        if (lblDaDuyet) lblDaDuyet.innerText = vDaDuyet;
        if (lblDangLam) lblDangLam.innerText = vDangLam;
        if (lblHoanThanh) lblHoanThanh.innerText = vHoanThanh;
        if (lblDaHuy) lblDaHuy.innerText = vDaHuy;
        if (lblDaGiao) lblDaGiao.innerText = vDaGiao;

        if (document.querySelector("#statusPieChartContainer")) {
            const pieOptions = {
                series: [vChoXuLy, vDaDuyet, vDangLam, vHoanThanh, vDaHuy, vDaGiao],
                chart: { type: 'pie', height: 300, fontFamily: 'Public Sans', offsetY: -10 },
                plotOptions: { pie: { customScale: 1, dataLabels: { offset: -15 } } },
                labels: ['Chờ Xử Lý', 'Đã Duyệt', 'Đang Chuẩn Bị', 'Hoàn Thành', 'Đã Hủy', 'Đã Giao'],
                colors: ['#03c3ec', '#696cff', '#ffab00', '#71dd37', '#ff3e1d', '#233446'],
                legend: { position: 'bottom', horizontalAlign: 'center', labels: { colors: '#566a7f' }, fontSize: '12px' },
                dataLabels: {
                    enabled: true,
                    style: { fontSize: '13px', fontWeight: 'bold', colors: ['#fff'] },
                    dropShadow: { enabled: false },
                    formatter: function (val, opts) {
                        try {
                            const total = opts.w.globals.seriesTotals[opts.seriesIndex];
                            return total > 0 ? total + " đơn" : "";
                        } catch(e) {
                            return Math.round(val) + "%";
                        }
                    }
                }
            };
            const pieChart = new ApexCharts(document.querySelector("#statusPieChartContainer"), pieOptions);
            pieChart.render();
        }

        const sortedAllOrders = [...orders].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)).slice(0, 7);
        tableBody.innerHTML = '';
        sortedAllOrders.forEach(dh => {
            const id = dh.orderId;
            const maHienThi = `DH${id}`;
            const tenKhach = dh.customerName || '👤 Khách hàng vãng lai';
            const tienFormat = new Intl.NumberFormat('vi-VN').format(dh.totalAmount || 0) + ' đ';
            const trangThai = dh.orderStatus || 'Chờ xử lý';
            const laCustom = dh.customBuildId != null || dh.isCustom;

            let colorBadgeClass = 'bg-label-secondary';
            const lowerS = trangThai.toLowerCase();
            if (lowerS.includes("duyệt")) colorBadgeClass = 'bg-label-primary';
            if (lowerS.includes("chuẩn bị") || lowerS.includes("ráp")) colorBadgeClass = 'bg-label-warning';
            if (lowerS.includes("hoàn thành")) colorBadgeClass = 'bg-label-success';
            if (lowerS.includes("giao") || lowerS.includes("thanh toán")) colorBadgeClass = 'bg-label-info';
            if (lowerS.includes("hủy")) colorBadgeClass = 'bg-label-dark';

            const loaiDonBadge = laCustom
                ? `<span class="badge bg-label-warning"><i class="bx bx-chip me-1"></i>PC Lắp Ráp</span>`
                : `<span class="badge bg-label-secondary">Tiêu chuẩn</span>`;

            tableBody.innerHTML += `
                <tr>
                    <td><span class="text-primary fw-bold">#${id}</span></td>
                    <td><strong>${tenKhach}</strong></td>
                    <td>${loaiDonBadge}</td>
                    <td><strong class="text-success">${tienFormat}</strong></td>
                    <td><span class="badge ${colorBadgeClass} fw-bold">${trangThai}</span></td>
                </tr>`;
        });

        function updateChartData() {
            const filterType = filterSelect ? filterSelect.value : 'ngay';
            let categories = []; let dataSeries = []; let labelName = "Doanh thu thực nhận";
            const now = new Date();

            if (filterType === 'ngay') {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(); d.setDate(now.getDate() - i);
                    categories.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
                    const targetYMD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    let sumDay = 0;

                    validOrders.forEach(dh => {
                        let dateYMD = normalizeToYMD(dh.orderDate);
                        if (dateYMD === targetYMD) {
                            sumDay += dh.totalAmount || 0;
                        }
                    });
                    dataSeries.push(sumDay);
                }
            } else if (filterType === 'thang') {
                for (let m = 1; m <= 12; m++) {
                    categories.push(`Tháng ${m}`); let sumMonth = 0;
                    validOrders.forEach(dh => {
                        const oYMD = normalizeToYMD(dh.orderDate);
                        if (oYMD && parseInt(oYMD.split('-')[1]) === m && parseInt(oYMD.split('-')[0]) === now.getFullYear()) {
                            sumMonth += dh.totalAmount || 0;
                        }
                    });
                    dataSeries.push(sumMonth);
                }
            } else if (filterType === 'nam') {
                let yearsSet = new Set([now.getFullYear()]);
                validOrders.forEach(dh => {
                    const oYMD = normalizeToYMD(dh.orderDate);
                    if (oYMD) yearsSet.add(parseInt(oYMD.split('-')[0]));
                });

                categories = Array.from(yearsSet).sort((a, b) => a - b);
                categories.forEach(y => {
                    let sumYear = 0;
                    validOrders.forEach(dh => {
                        const oYMD = normalizeToYMD(dh.orderDate);
                        if (oYMD && parseInt(oYMD.split('-')[0]) === y) {
                            sumYear += dh.totalAmount || 0;
                        }
                    });
                    dataSeries.push(sumYear);
                });
            }

            const chartOptions = {
                series: [{ name: labelName, data: dataSeries }],
                chart: { type: 'area', height: 300, parentHeightOffset: 0, toolbar: { show: false }, fontFamily: 'Public Sans' },
                dataLabels: { enabled: false }, stroke: { curve: 'smooth', width: 3 }, colors: ['#696cff'],
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100] } },
                xaxis: { categories: categories },
                yaxis: { labels: { formatter: val => new Intl.NumberFormat('vi-VN').format(val) + ' đ' } },
                tooltip: { y: { formatter: val => new Intl.NumberFormat('vi-VN').format(val) + ' đ' } },
                grid: { borderColor: '#f1f1f1', padding: { top: -20, bottom: -10 } }
            };

            if (revenueChart) revenueChart.updateOptions(chartOptions);
            else { revenueChart = new ApexCharts(document.querySelector("#revenueChartContainer"), chartOptions); revenueChart.render(); }
        }

        if (document.querySelector("#revenueChartContainer")) {
            updateChartData();
            if (filterSelect) filterSelect.addEventListener('change', updateChartData);
        }
    } catch (err) {
        console.error("Lỗi đồng bộ Dashboard:", err);
    }

    // -------------------------------------------------------------------------
    // KPDL: LOAD K-MEANS & APRIORI
    // -------------------------------------------------------------------------
    async function loadDataMining() {
        // Load K-Means
        const kmeansContainer = document.getElementById('kmeansContainer');
        if (kmeansContainer) {
            try {
                const resK = await fetch(`${API_URL}/api/Analytics/CustomerSegments`);
                if (resK.ok) {
                    const dataK = await resK.json();
                    let htmlK = `<div class="table-responsive"><table class="table table-sm table-bordered">
                        <thead class="table-light"><tr><th>Cụm</th><th>Mô tả</th><th>SL Khách</th></tr></thead><tbody>`;
                    
                    let segments = dataK.segments || dataK.Segments || [];
                    if (dataK && dataK.$values) segments = dataK.$values;
                    if (segments.$values) segments = segments.$values;
                    
                    segments.forEach(c => {
                        let badge = 'bg-secondary';
                        let desc = 'Khách hàng';
                        let clusterId = (c.clusterId !== undefined ? c.clusterId : (c.ClusterId !== undefined ? c.ClusterId : 0));
                        let customerCount = (c.customerCount !== undefined ? c.customerCount : c.CustomerCount);
                        
                        if (clusterId === 0) { badge = 'bg-success'; desc = 'VIP (Nhiều đơn, Giá trị cao)'; }
                        else if (clusterId === 1) { badge = 'bg-info'; desc = 'Tiềm năng (Vừa phải)'; }
                        else if (clusterId === 2) { badge = 'bg-warning'; desc = 'Phổ thông (Ít mua)'; }
                        
                        htmlK += `<tr>
                            <td><span class="badge ${badge}">Cụm ${clusterId + 1}</span></td>
                            <td class="text-start">${desc}</td>
                            <td class="fw-bold">${customerCount}</td>
                        </tr>`;
                    });
                    htmlK += `</tbody></table></div>`;
                    kmeansContainer.innerHTML = htmlK;
                } else {
                    kmeansContainer.innerHTML = `<p class="text-danger">Không tải được dữ liệu K-Means.</p>`;
                }
            } catch (err) {
                console.error("K-Means Error:", err);
                kmeansContainer.innerHTML = `<p class="text-danger">Lỗi kết nối API K-Means.</p>`;
            }
        }

        // Load Apriori
        const aprioriContainer = document.getElementById('aprioriContainer');
        if (aprioriContainer) {
            try {
                const resA = await fetch(`${API_URL}/api/Analytics/ProductAssociations`);
                if (resA.ok) {
                    let dataA = await resA.json();
                    let rules = dataA.rules || dataA.Rules || [];
                    if (dataA && dataA.$values) rules = dataA.$values;
                    if (rules.$values) rules = rules.$values;

                    if (rules && rules.length > 0) {
                        let htmlA = `<div class="table-responsive"><table class="table table-sm table-hover border">
                            <thead class="table-light"><tr><th>Luật kết hợp (Khi mua X -> Gợi ý Y)</th><th>Độ tin cậy</th></tr></thead><tbody>`;
                        
                        rules.slice(0, 5).forEach(r => {
                            let confidence = (r.confidence !== undefined ? r.confidence : r.Confidence);
                            let antName = (r.antecedentName || r.AntecedentName || 'Danh mục A');
                            let consName = (r.consequentName || r.ConsequentName || 'Danh mục B');
                            
                            const conf = (confidence * 100).toFixed(1) + '%';
                            htmlA += `<tr>
                                <td class="text-start text-wrap"><span class="text-primary fw-semibold">${antName}</span> <i class="bx bx-right-arrow-alt text-muted mx-1"></i> <span class="text-success fw-semibold">${consName}</span></td>
                                <td class="fw-bold text-center">${conf}</td>
                            </tr>`;
                        });
                        htmlA += `</tbody></table></div>`;
                        aprioriContainer.innerHTML = htmlA;
                    } else {
                        aprioriContainer.innerHTML = `<p class="text-muted">Chưa đủ dữ liệu đơn hàng để tạo luật gợi ý.</p>`;
                    }
                } else {
                    aprioriContainer.innerHTML = `<p class="text-danger">Không tải được dữ liệu Apriori.</p>`;
                }
            } catch (err) {
                console.error("Apriori Error:", err);
                aprioriContainer.innerHTML = `<p class="text-danger">Lỗi kết nối API Apriori.</p>`;
            }
        }
    }

    loadDataMining();
});
