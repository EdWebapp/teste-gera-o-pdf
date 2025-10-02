// script.js - VERSÃO FINAL (COM CORREÇÃO DE LISTENER DE ORDENAÇÃO E FORMATAÇÃO DE DATA)

// =========================================================
// 1. DICIONÁRIO E VARIÁVEIS DE ESTADO
// =========================================================
const DATABASE = {
    'vendas': {
        title: "Relatório de Vendas - Dados de Teste",
        url: "dadosteste.csv" 
    },
    'estoque': {
        title: "Inventário de Estoque",
        csv: `Produto,Quantidade,PrecoUnitario,Status
Monitor 27',150,1200,Disponível
Mouse Gamer,450,85,Baixo
Teclado Mecânico,210,350,Disponível
Webcam HD,50,450,Esgotado
Headset Pro,320,150,Disponível`
    },
    'clientes': {
        title: "Base de Clientes (Top 5)",
        csv: `Cliente,TotalComprado,CadastradoEm,Local
Alfa Ltda,52000,2021,SP
Beta S.A.,35000,2022,RJ
Gama Tech,18000,2023,MG
Delta Com,9500,2024,PR
Epsilon Eireli,1200,2024,SC`
    },
    'marketing': {
        title: "Desempenho de Marketing (Cliques)",
        csv: `Campanha,Cliques,Custo,Conversoes
Google Ads Q1,5500,3200,120
Facebook Ads Q1,7800,2500,95
SEO Orgânico,12000,0,250
Email Mkt,4500,150,60`
    }
};

let myChart = null; 
let myChart2 = null; 

let allData = [];
let currentSort = { column: null, direction: 'asc' };

// =========================================================
// 2. FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
// =========================================================
async function initializeReportPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const baseName = urlParams.get('base');

    if (!baseName) {
         document.getElementById('report-header').textContent = "Selecione uma base no Dashboard Principal!";
         return; 
    }

    const baseData = DATABASE[baseName];
    if (!baseData) {
        document.getElementById('report-header').textContent = "Base de Dados Não Encontrada!";
        return;
    }

    document.getElementById('report-header').textContent = baseData.title;

    let csvContent = null;

    if (baseData.url) {
        try {
            const response = await fetch(baseData.url);
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            csvContent = await response.text();
        } catch (error) {
            console.error("Erro no Fetch:", error);
            document.getElementById('data-table').innerHTML = 
                '<tr><td>Erro: Falha ao carregar o arquivo CSV externo. (Verifique o nome do arquivo)</td></tr>';
            return;
        }
    } else if (baseData.csv) {
        csvContent = baseData.csv;
    }

    if (csvContent) {
        Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                allData = results.data.filter(row => Object.values(row).some(val => val !== null && val !== ''));
                
                renderCharts(allData, baseName); 
                displayTable(allData); 
                
                attachSearchListener();
            },
            error: function(error) {
                console.error("Erro no Papa Parse:", error);
                document.getElementById('data-table').innerHTML = 
                    '<tr><td>Erro: O CSV está em um formato inválido.</td></tr>';
            }
        });
    }
}

// =========================================================
// 3. FUNÇÕES DE FILTRAGEM E ORDENAÇÃO
// =========================================================
function filterData(data, searchTerm) {
    if (!searchTerm) {
        return data;
    }
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return data.filter(row => {
        return Object.values(row).some(value => 
            String(value).toLowerCase().includes(lowerCaseSearch)
        );
    });
}

function sortData(data, column, direction) {
    
    return data.sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        
        let comparison = 0;

        if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        } else {
            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            comparison = strA.localeCompare(strB);
        }

        return direction === 'asc' ? comparison : comparison * -1;
    });
}

function updateTableDisplay() {
    const searchInput = document.getElementById('data-search-input');
    const searchTerm = searchInput ? searchInput.value : '';

    let dataToDisplay = filterData([...allData], searchTerm);

    if (currentSort.column) {
        dataToDisplay = sortData(dataToDisplay, currentSort.column, currentSort.direction);
    }

    displayTable(dataToDisplay);
}


// =========================================================
// 4. FUNÇÃO DE VISUALIZAÇÃO DA TABELA (MODIFICADA PARA FORMATAR DATA)
// =========================================================
function displayTable(data) {
    const table = document.getElementById('data-table');
    table.innerHTML = ''; 
    
    if (data.length === 0 || !allData[0] || Object.keys(allData[0]).length === 0) {
        if (allData.length > 0) {
            table.innerHTML = '<tr><td colspan="' + Object.keys(allData[0]).length + '">Nenhum resultado encontrado.</td></tr>';
        } else {
            table.innerHTML = '<tr><td>Nenhum dado encontrado ou CSV vazio.</td></tr>';
        }
        return;
    }
    
    const columnNames = Object.keys(allData[0]);

    let thead = table.createTHead();
    let row = thead.insertRow();
    
    columnNames.forEach(key => {
        let th = document.createElement('th');
        th.textContent = key;
        
        th.classList.add('sortable');
        if (currentSort.column === key) {
            th.classList.add(currentSort.direction);
        }
        
        row.appendChild(th);
    });
    
    attachSortingListenersToHeaders();

    let tbody = table.createTBody();
    data.forEach(item => {
        let row = tbody.insertRow();
        columnNames.forEach(key => {
            let cell = row.insertCell(); 
            let value = item[key] !== null && item[key] !== undefined ? item[key] : '';
            
            // NOVO: Lógica de formatação de data AAAA-MM-DD para DD/MM/AAAA
            if (key === 'Data' && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const parts = value.split('-'); // ["2024", "05", "01"]
                value = `${parts[2]}/${parts[1]}/${parts[0]}`; // "01/05/2024"
            }
            
            cell.textContent = value; 
        });
    });
}


// =========================================================
// 5. LIGAÇÃO DE EVENTOS
// =========================================================

function attachSortingListenersToHeaders() {
    const tableHeaders = document.querySelectorAll('#data-table th');
    
    tableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const column = header.textContent.trim(); 
            
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.column = column;
                currentSort.direction = 'asc';
            }

            updateTableDisplay(); 
        });
    });
}

function attachSearchListener() {
    const searchInput = document.getElementById('data-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', updateTableDisplay); 
    }
}


// =========================================================
// 6. FUNÇÕES DE GRÁFICOS E PDF 
// =========================================================
function renderCharts(data, baseName) {
    generateChart(data, baseName, 'myChart', 'bar'); 
    generateChart(data, baseName, 'myChart2', 'doughnut'); 
}

function generateChart(data, baseName, canvasId, chartType) {
    let chartInstance = (canvasId === 'myChart') ? myChart : myChart2;
    if (chartInstance) { chartInstance.destroy(); }
    if (data.length < 2 || !data[0]) return;
    const columnNames = Object.keys(data[0]);
    let labelColForChart, valueColForChart, titlePrefix, backgroundColor, borderColor;

    if (canvasId === 'myChart') {
        const isVendasTest = (baseName === 'vendas' && columnNames.includes('Valor') && columnNames.includes('Produto'));
        labelColForChart = isVendasTest ? 'Produto' : columnNames[0]; 
        valueColForChart = isVendasTest ? 'Valor' : columnNames[1]; 
        titlePrefix = 'Visualização Primária:';
        backgroundColor = 'rgba(54, 162, 235, 0.7)'; 
        borderColor = 'rgba(54, 162, 235, 1)';
    } else if (canvasId === 'myChart2') {
        if (baseName === 'vendas' && columnNames.includes('Valor') && columnNames.includes('Regiao')) {
            labelColForChart = 'Regiao';
            valueColForChart = 'Valor';
        } else if (columnNames.length > 2) {
            labelColForChart = columnNames[0]; 
            valueColForChart = columnNames[2]; 
        } else { return; }
        titlePrefix = 'Visualização Secundária:';
        backgroundColor = ['rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(200, 200, 200, 0.7)'];
        borderColor = 'rgba(255, 255, 255, 1)'; 
    }

    const aggregatedData = data.reduce((acc, row) => {
        const key = String(row[labelColForChart]);
        const value = Number(row[valueColForChart]);
        if (key && !isNaN(value)) { acc[key] = (acc[key] || 0) + value; }
        return acc;
    }, {});

    const labels = Object.keys(aggregatedData);
    const values = Object.values(aggregatedData);
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    chartInstance = new Chart(ctx, { 
        type: chartType, 
        data: {
            labels: labels, 
            datasets: [{
                label: `Total Agregado: ${valueColForChart}`,
                data: values, 
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: (chartType === 'doughnut') ? 2 : 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: (chartType === 'doughnut') ? {} : { 
                y: { beginAtZero: true, title: { display: true, text: valueColForChart } },
                x: { title: { display: true, text: labelColForChart } }
            },
            plugins: {
                title: { display: true, text: `${titlePrefix} ${valueColForChart} por ${labelColForChart}` },
                legend: { display: (chartType === 'doughnut'), position: 'right' }
            }
        }
    });

    if (canvasId === 'myChart') { myChart = chartInstance; } else { myChart2 = chartInstance; }
}

function exportToPDF() {
    if (!myChart) { alert("Gráfico principal não está pronto."); return; }
    const chartsToProcess = [{ chart: myChart, canvasId: 'myChart' }, { chart: myChart2, canvasId: 'myChart2' }].filter(item => item.chart !== null);
    const originalStates = [];
    chartsToProcess.forEach(item => {
        const chart = item.chart;
        const container = document.querySelector(`[data-chart-id="${item.canvasId}"]`); 
        originalStates.push({ chart: chart, container: container, originalBoxShadow: container ? container.style.boxShadow : null, originalResponsive: chart.options.responsive });
        try { if (container) { container.style.boxShadow = 'none'; } chart.options.responsive = false; chart.resize(); } catch (e) { console.error(`Erro ao preparar o gráfico ${item.canvasId} para PDF:`, e); }
    });

    async function captureAndAddCharts(doc, y_offset) {
        let current_y_offset = y_offset;
        for (const item of chartsToProcess) {
            const chartCanvas = document.getElementById(item.canvasId);
            if (chartCanvas) {
                doc.setFontSize(14);
                doc.text(`Gráfico ${item.canvasId === 'myChart' ? 'Primário' : 'Secundário'}`, 10, current_y_offset);
                current_y_offset += 10;
                const canvas = await html2canvas(chartCanvas, { backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 190; const imgHeight = canvas.height * imgWidth / canvas.width;
                if (current_y_offset + imgHeight > doc.internal.pageSize.height - 20) { doc.addPage(); current_y_offset = 20; }
                doc.addImage(imgData, 'PNG', 10, current_y_offset, imgWidth, imgHeight);
                current_y_offset += imgHeight + 10; 
            }
        }
        return current_y_offset;
    }

    const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    const pageTitle = document.getElementById('report-header').textContent;
    const filename = pageTitle.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '.pdf';
    doc.setFontSize(16);
    doc.text(pageTitle, 10, 20); 
    let y_offset = 30; 

    captureAndAddCharts(doc, y_offset).then((new_y_offset) => {
        y_offset = new_y_offset;
        const tableElement = document.getElementById('data-table');
        if (y_offset > doc.internal.pageSize.height - 40) { doc.addPage(); y_offset = 20; }
        doc.autoTable({
            startY: y_offset, html: tableElement, theme: 'striped', headStyles: { fillColor: [54, 162, 235] }, margin: { left: 10, right: 10 },
            didDrawPage: function (data) { doc.setFontSize(10); doc.text("Página " + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 10); }
        });
        doc.save(filename);
    }).catch(error => { console.error("Erro na geração do PDF (Multi-Chart):", error);
    }).finally(() => {
        originalStates.forEach(item => {
            try { item.chart.options.responsive = item.originalResponsive; item.chart.resize(); if (item.container) { item.container.style.boxShadow = item.originalBoxShadow; } } catch (e) { console.error("Erro na restauração do estado:", e); }
        });
    });
}

function waitForPdfLibraries() {
    return new Promise((resolve) => {
        const check = setInterval(() => {
            if (typeof window.jspdf !== 'undefined' && typeof window.html2canvas !== 'undefined') { clearInterval(check); resolve(); }
        }, 100);
    });
}

async function attachPdfListener() {
    const exportButton = document.getElementById('export-pdf-button');
    if (exportButton) {
        exportButton.disabled = true;
        exportButton.textContent = 'Carregando PDF...';
        await waitForPdfLibraries();
        exportButton.disabled = false;
        exportButton.textContent = '⬇️ Exportar para PDF';
        exportButton.addEventListener('click', exportToPDF);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeReportPage();
    attachPdfListener(); 
});
