// script.js - MODIFICADO PARA SUPORTE A DOIS GRÁFICOS E PDF MULTI-CHART

// =========================================================
// 1. DICIONÁRIO DE DADOS (Sem Alterações)
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
let myChart2 = null; // NOVO: Variável para o segundo gráfico

// =========================================================
// 2. FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO (Pequena Alteração)
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
                const data = results.data.filter(row => Object.values(row).some(val => val !== null && val !== ''));
                displayTable(data); 
                renderCharts(data, baseName); // Chamada para a nova função de renderização
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
// 3. FUNÇÃO DE VISUALIZAÇÃO DA TABELA (Sem Alterações)
// =========================================================
function displayTable(data) {
    const table = document.getElementById('data-table');
    table.innerHTML = ''; 
    
    if (data.length === 0 || !data[0] || Object.keys(data[0]).length === 0) {
        table.innerHTML = '<tr><td>Nenhum dado encontrado ou CSV vazio.</td></tr>';
        return;
    }
    
    let thead = table.createTHead();
    let row = thead.insertRow();
    Object.keys(data[0]).forEach(key => {
        let th = document.createElement('th');
        th.textContent = key;
        row.appendChild(th);
    });
    
    let tbody = table.createTBody();
    data.forEach(item => {
        let row = tbody.insertRow();
        Object.values(item).forEach(value => {
            let cell = row.insertCell(); 
            cell.textContent = value !== null && value !== undefined ? value : ''; 
        });
    });
}

// =========================================================
// 4. FUNÇÃO DE GERAÇÃO DOS GRÁFICOS (COMPLETAMENTE REFATORADA)
// =========================================================

/**
 * Função Wrapper para renderizar todos os gráficos necessários.
 */
function renderCharts(data, baseName) {
    // Gráfico 1: Primário (Coluna 1 vs Coluna 2) - Tipo Bar
    generateChart(data, baseName, 'myChart', 'bar'); 

    // Gráfico 2: Secundário (Agregação alternativa) - Tipo Doughnut (Pizza)
    generateChart(data, baseName, 'myChart2', 'doughnut'); 
}

/**
 * Função centralizada para configurar e renderizar um gráfico.
 */
function generateChart(data, baseName, canvasId, chartType) {
    
    let chartInstance = (canvasId === 'myChart') ? myChart : myChart2;

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (data.length < 2 || !data[0]) return;

    const columnNames = Object.keys(data[0]);

    // ----------------------------------------------------
    // 1. Definição das Colunas e Estilos
    // ----------------------------------------------------

    let labelColForChart, valueColForChart;
    let titlePrefix;
    let backgroundColor;
    let borderColor;

    if (canvasId === 'myChart') {
        // Lógica do gráfico primário (Original: Valor por Produto)
        const isVendasTest = (baseName === 'vendas' && columnNames.includes('Valor') && columnNames.includes('Produto'));
        labelColForChart = isVendasTest ? 'Produto' : columnNames[0]; 
        valueColForChart = isVendasTest ? 'Valor' : columnNames[1]; 
        titlePrefix = 'Visualização Primária:';
        backgroundColor = 'rgba(54, 162, 235, 0.7)'; // Azul
        borderColor = 'rgba(54, 162, 235, 1)';
        
    } else if (canvasId === 'myChart2') {
        // Lógica para o novo gráfico (Agregação Secundária)
        
        if (baseName === 'vendas' && columnNames.includes('Valor') && columnNames.includes('Regiao')) {
            // Regra Específica para Vendas: Valor Agregado por Região
            labelColForChart = 'Regiao';
            valueColForChart = 'Valor';
        } else if (columnNames.length > 2) {
            // Regra Geral: Coluna 1 (Rótulo) vs Coluna 3 (Valor)
            labelColForChart = columnNames[0]; 
            valueColForChart = columnNames[2]; 
        } else {
            // Não há dados suficientes para o segundo gráfico
            return;
        }

        titlePrefix = 'Visualização Secundária:';
        // Cores Múltiplas para Gráfico de Pizza/Doughnut
        backgroundColor = [
            'rgba(255, 99, 132, 0.7)', 
            'rgba(255, 206, 86, 0.7)', 
            'rgba(75, 192, 192, 0.7)', 
            'rgba(153, 102, 255, 0.7)', 
            'rgba(255, 159, 64, 0.7)', 
            'rgba(200, 200, 200, 0.7)' 
        ];
        borderColor = 'rgba(255, 255, 255, 1)'; 
    }

    // ----------------------------------------------------
    // 2. Agregação dos Dados
    // ----------------------------------------------------
    const aggregatedData = data.reduce((acc, row) => {
        const key = String(row[labelColForChart]);
        const value = Number(row[valueColForChart]);
        if (key && !isNaN(value)) {
            acc[key] = (acc[key] || 0) + value;
        }
        return acc;
    }, {});

    const labels = Object.keys(aggregatedData);
    const values = Object.values(aggregatedData);

    // ----------------------------------------------------
    // 3. Renderização do Chart.js
    // ----------------------------------------------------
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
            scales: (chartType === 'doughnut') ? {} : { // Sem scales para doughnut
                y: { beginAtZero: true, title: { display: true, text: valueColForChart } },
                x: { title: { display: true, text: labelColForChart } }
            },
            plugins: {
                title: {
                    display: true,
                    text: `${titlePrefix} ${valueColForChart} por ${labelColForChart}`
                },
                legend: {
                    display: (chartType === 'doughnut'), // Exibe legenda apenas para doughnut
                    position: 'right',
                }
            }
        }
    });

    // Atualiza a variável global
    if (canvasId === 'myChart') {
        myChart = chartInstance;
    } else {
        myChart2 = chartInstance;
    }
}


// =========================================================
// 5. FUNÇÃO DE EXPORTAÇÃO DE PDF (MODIFICADA para Multi-Chart)
// =========================================================
function exportToPDF() {
    
    if (!myChart) {
        alert("Gráfico principal não está pronto.");
        return;
    }
    
    // Lista de todos os gráficos a serem processados
    const chartsToProcess = [
        { chart: myChart, canvasId: 'myChart' },
        { chart: myChart2, canvasId: 'myChart2' }
    ].filter(item => item.chart !== null); // Remove gráficos nulos (se o myChart2 não foi gerado)

    // Variáveis de Estado para Restauração
    const originalStates = [];

    // --- PRÉ-CAPTURA: Estabilização do Canvas e Estilo ---
    chartsToProcess.forEach(item => {
        const chart = item.chart;
        // Pega o container usando o novo atributo data-chart-id do HTML
        const container = document.querySelector(`[data-chart-id="${item.canvasId}"]`); 

        // Salva estados originais
        originalStates.push({
            chart: chart,
            container: container,
            originalBoxShadow: container ? container.style.boxShadow : null,
            originalResponsive: chart.options.responsive
        });
        
        // Aplica modificações (remove sombra, desativa responsividade)
        try {
            if (container) {
                container.style.boxShadow = 'none';
            }
            chart.options.responsive = false; 
            chart.resize(); 
        } catch (e) {
            console.error(`Erro ao preparar o gráfico ${item.canvasId} para PDF:`, e);
        }
    });

    // Função assíncrona para capturar e adicionar cada gráfico
    async function captureAndAddCharts(doc, y_offset) {
        
        let current_y_offset = y_offset;

        for (const item of chartsToProcess) {
            const chartCanvas = document.getElementById(item.canvasId);

            if (chartCanvas) {
                doc.setFontSize(14);
                // Adiciona um título descritivo antes do gráfico
                doc.text(`Gráfico ${item.canvasId === 'myChart' ? 'Primário' : 'Secundário'}`, 10, current_y_offset);
                current_y_offset += 10;
                
                const canvas = await html2canvas(chartCanvas, { 
                    backgroundColor: '#ffffff' 
                });

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 190; 
                const imgHeight = canvas.height * imgWidth / canvas.width;

                // Adiciona uma nova página se o gráfico não couber
                if (current_y_offset + imgHeight > doc.internal.pageSize.height - 20) {
                    doc.addPage();
                    current_y_offset = 20;
                }
                
                doc.addImage(imgData, 'PNG', 10, current_y_offset, imgWidth, imgHeight);
                current_y_offset += imgHeight + 10; 
            }
        }
        return current_y_offset;
    }


    // --- GERAÇÃO DO PDF ---
    const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
    
    const pageTitle = document.getElementById('report-header').textContent;
    const filename = pageTitle.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '.pdf';
    
    doc.setFontSize(16);
    doc.text(pageTitle, 10, 20); 
    
    let y_offset = 30; 

    // Captura e Adiciona Gráficos
    captureAndAddCharts(doc, y_offset).then((new_y_offset) => {
        y_offset = new_y_offset;

        // Adiciona Tabela
        const tableElement = document.getElementById('data-table');
        
        if (y_offset > doc.internal.pageSize.height - 40) {
             doc.addPage();
             y_offset = 20;
        }

        doc.autoTable({
            startY: y_offset,
            html: tableElement,
            theme: 'striped',
            headStyles: { fillColor: [54, 162, 235] },
            margin: { left: 10, right: 10 },
            didDrawPage: function (data) {
                doc.setFontSize(10);
                doc.text("Página " + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        
        doc.save(filename);

    }).catch(error => {
        console.error("Erro na geração do PDF (Multi-Chart):", error);
    }).finally(() => {
        // --- PÓS-CAPTURA: Restauração do Estado ---
        originalStates.forEach(item => {
            try {
                item.chart.options.responsive = item.originalResponsive;
                item.chart.resize();
                if (item.container) {
                    item.container.style.boxShadow = item.originalBoxShadow;
                }
            } catch (e) {
                 console.error("Erro na restauração do estado:", e);
            }
        });
    });
}

// =========================================================
// 6. LIGAÇÃO DE EVENTOS (Sem Alterações)
// =========================================================

function waitForPdfLibraries() {
    return new Promise((resolve) => {
        const check = setInterval(() => {
            if (typeof window.jspdf !== 'undefined' && typeof window.html2canvas !== 'undefined') {
                clearInterval(check);
                resolve(); 
            }
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
