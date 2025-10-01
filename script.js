// script.js

// =========================================================
// 1. DICIONÁRIO DE DADOS
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

// =========================================================
// 2. FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO (Corrigida para usar URL)
// =========================================================
async function initializeReportPage() {
    // CORRIGIDO: Lendo o parâmetro 'base' da URL (ex: ?base=clientes)
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
                generateChart(data, baseName); 
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
// 4. FUNÇÃO DE GERAÇÃO DO GRÁFICO (Sem Alterações)
// =========================================================
function generateChart(data, baseName) {
    if (myChart) {
        myChart.destroy();
    }

    if (data.length < 2 || !data[0]) return;

    const columnNames = Object.keys(data[0]);

    const isVendasTest = (baseName === 'vendas' && columnNames.includes('Valor') && columnNames.includes('Produto'));
    
    const labelColForChart = isVendasTest ? 'Produto' : columnNames[0]; 
    const valueColForChart = isVendasTest ? 'Valor' : columnNames[1]; 
    
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

    let chartType = 'bar';
    let backgroundColor = 'rgba(54, 162, 235, 0.7)';
    let borderColor = 'rgba(54, 162, 235, 1)';
    
    const ctx = document.getElementById('myChart').getContext('2d');
    
    myChart = new Chart(ctx, { 
        type: chartType, 
        data: {
            labels: labels, 
            datasets: [{
                label: `Total Agregado: ${valueColForChart}`,
                data: values, 
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: valueColForChart } },
                x: { title: { display: true, text: labelColForChart } }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Visualização Agregada: ${valueColForChart} por ${labelColForChart}`
                }
            }
        }
    });
}

// =========================================================
// 5. FUNÇÃO DE EXPORTAÇÃO DE PDF
// =========================================================
function exportToPDF() {
    
    if (!myChart) {
        alert("Gráfico não está pronto.");
        return;
    }
    
    // Variáveis de Estado para Restauração
    const chartContainer = document.querySelector('.chart-container');
    const chartCanvas = document.getElementById('myChart');
    const originalBoxShadow = chartContainer.style.boxShadow;
    const originalResponsive = myChart.options.responsive;

    // --- PRÉ-CAPTURA: Estabilização do Canvas e Estilo ---
    try {
        // 1. Desativa a responsividade e força o redimensionamento
        myChart.options.responsive = false; 
        myChart.resize(); 
        
        // 2. Remove a sombra que causa falha no html2canvas
        chartContainer.style.boxShadow = 'none';

    } catch (e) {
        console.error("Erro ao preparar o gráfico para PDF:", e);
    }

    // --- CAPTURA ---
    html2canvas(chartCanvas, { 
        backgroundColor: '#ffffff' 
    }).then(canvas => {
        
        // --- PÓS-CAPTURA: Restauração do Canvas e Sombra ---
        myChart.options.responsive = originalResponsive;
        myChart.resize();
        chartContainer.style.boxShadow = originalBoxShadow; 

        // --- GERAÇÃO DO PDF ---
        // CORRIGIDO: Acessa o construtor diretamente via window.jspdf.jsPDF, que é a forma mais robusta 
        // de instanciar o jsPDF quando o UMD está sendo usado.
        const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
        
        const pageTitle = document.getElementById('report-header').textContent;
        const filename = pageTitle.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '.pdf';
        
        doc.setFontSize(16);
        doc.text(pageTitle, 10, 20); 
        
        let y_offset = 30; 
        
        // Adiciona Gráfico
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 190; 
        const imgHeight = canvas.height * imgWidth / canvas.width;
        doc.addImage(imgData, 'PNG', 10, y_offset, imgWidth, imgHeight);
        y_offset += imgHeight + 10; 

        // Adiciona Tabela
        const tableElement = document.getElementById('data-table');
        // O método autoTable só funciona se o plugin jspdf-autotable for carregado
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
        // Garante que o estado seja restaurado mesmo em caso de falha na captura
        myChart.options.responsive = originalResponsive;
        myChart.resize();
        chartContainer.style.boxShadow = originalBoxShadow; 
        
        console.error("Erro na geração do PDF:", error);
        alert("Falha na geração do PDF. Tente clicar no botão novamente (problema de sincronização/carregamento).");
    });
}

// =========================================================
// 6. LIGAÇÃO DE EVENTOS
// =========================================================

/**
 * Verifica e aguarda o carregamento das bibliotecas de PDF.
 */
function waitForPdfLibraries() {
    return new Promise((resolve) => {
        const check = setInterval(() => {
            // Verifica a disponibilidade do objeto jsPDF e do html2canvas
            if (typeof window.jspdf !== 'undefined' && typeof window.html2canvas !== 'undefined') {
                clearInterval(check);
                resolve(); 
            }
        }, 100);
    });
}

/**
 * Habilita o botão de PDF apenas após a confirmação do carregamento das libs.
 */
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

// Inicia a aplicação após o DOM carregar completamente
document.addEventListener('DOMContentLoaded', () => {
    initializeReportPage();
    attachPdfListener(); 
});
