import {
  ConditionType,
  LegislationImpact,
  LegislationType,
  LicenseLegislationSource,
} from '@prisma/client';
import { LicenseExtraction } from '../../domain/license-extraction';

export const DEMO_LICENSE_FILE_NAME =
  'Exemplo Licença Ambiental de Transporte (2).pdf';

export const DEMO_LICENSE_EXTRACTION_DELAY_MS = 20_000;

export function isDemoLicenseFile(fileName?: string): boolean {
  if (!fileName) return false;

  if (fileName.normalize('NFC') === DEMO_LICENSE_FILE_NAME) {
    return true;
  }

  // Multer/busboy decodes multipart Content-Disposition filenames as Latin-1
  // by default, turning UTF-8 accented characters into mojibake.
  const decoded = Buffer.from(fileName, 'latin1')
    .toString('utf8')
    .normalize('NFC');

  return decoded === DEMO_LICENSE_FILE_NAME;
}

const DEMO_LICENSE_EXTRACTION: LicenseExtraction = {
  extractedData: {
    type: 'LU',
    processNumber: 'LU Nº 00865 / 2022',
    issuingAgency: 'FEPAM',
    issueDate: '2022-04-28',
    expirationDate: '2027-04-29',
  },
  suggestedConditions: [
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'deverá ser observada a legislação pertinente ao transporte rodoviário de produtos e/ou resíduos perigosos;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'os veículos deverão estar com a simbologia e a documentação conforme Legislação para Transporte Rodoviário de Produtos e/ou Resíduos Perigosos e o motorista deve estar habilitado para o transporte de produtos e/ou resíduos perigosos;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'os veículos deverão portar, quando aplicável, CIPP - Certificado de Inspeção para o Transporte de Produtos Perigosos e CIV - Certificado de Inspeção Veicular, expedido pelo INMETRO ou entidade por ele credenciada;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'a relação das placas dos veículos, objeto desta licença, se encontra em documento anexo, cuja cópia deverá ser mantida atualizada no(s) veículo(s) licenciado(s), para fins de fiscalização;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'a responsabilidade técnica pelo transporte de produtos e/ou resíduos perigosos é de FERNANDO POZZA - (Cad 167378), que em caso de emergência deve ser acionado(a) pelos telefones: (51)9559-1379 ou (51)9855-8599 (Técnico Responsável), (51)3003-5300 (Empreendedor);',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'a Anotação de Responsabilidade Técnica - ART com data de vencimento anterior a 29/04/2027, deverá ser renovada e a nova ART informada à FEPAM (via Internet), antes do vencimento da anterior, sob pena de revogação da presente licença;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'em caso de baixa da responsabilidade técnica pelo Transporte de Produtos Perigosos, deverá ser prevista pelo empreendedor, com a devida antecedência, a contratação de novo Responsável Técnico, de modo que na mesma data de baixa da atual Anotação de Responsabilidade Técnica - ART junto à FEPAM, seja informada a nova ART em vigor, devendo ser solicitada a ATUALIZAÇÃO DE DOCUMENTO LICENCIATÓRIO, sob pena de suspensão da presente licença;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'em caso de afastamento temporário do Responsável Técnico (RT), é aceito o período máximo de 30 DIAS. O RT deverá informar por meio eletrônico através dos seguintes endereços: produtosperigosos@fepam.rs.gov.br e emergencia@fepam.rs.gov.br, um profissional substituto que atenda aos mesmos requisitos, indicando NOME e DOIS NÚMEROS DE TELEFONE DO PROFISSIONAL PARA ATENDIMENTO 24HS, bem como o período de afastamento',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'o órgão ambiental poderá solicitar, a qualquer tempo, informações referentes ao posicionamento geográfico dos veículos de transporte licenciados;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'no caso de qualquer alteração neste documento (endereço, responsabilidade técnica) durante a vigência desta licença, o empreendedor deverá, via responsável técnico, solicitar eletronicamente no SOL da FEPAM a ATUALIZAÇÃO DE DOCUMENTO LICENCIATÓRIO, seguindo o Manual de Operação do Sistema. O pedido somente será analisado após o efetivo pagamento dos custos dos Serviços de Licenciamento Ambiental, conforme Resolução do Conselho de Administração em vigor;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'no caso de alteração de titularidade, a mesma deverá ser solicitada via SOL e deverão ser seguidas as recomendações descritas na PORTARIA CONJUNTA SEMA - FEPAM Nº 15, de 03 de dezembro de 2019 e suas alterações',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Empreendimento',
      description:
        'o(s) empreendedor(es) deste empreendimento deverá(ão) manter o Certificado de Regularidade do Cadastro Técnico Federal - CTF/APP válido(s) (www.ibama.gov.br) e, caso haja inclusão de novo(s) empreendedor(es), este(s) deverá (ão), no prazo de até 60 (sessenta) dias, apresentar o(s) Certificado(s) de Regularidade do CTF/APP válido(s), com correlação na(s) Ficha(s) Técnica(s) de Enquadramento: Categoria 18, Código 18 - 74, Transporte de cargas perigosas - Lei nº 12.305/2010',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'esta Licença não autoriza a coleta de Óleo Lubrificante Usado ou Contaminado;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'esta licença não autoriza a coleta de óleo lubrificante usado ou contaminado - OLUC;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'o transporte dos Resíduos deverá ser acompanhado do Manifesto de Transporte de Resíduos - MTR, emitido pelo gerador do resíduo, conforme o Art. 12 do Decreto Estadual nº 38.356 de 01/04/1998 e Portaria FEPAM n.º 087/2018, D.O.E. de 30/10/2018, e suas alterações. O MTR deverá conter o n° ONU correspondente;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'no caso de transporte de embalagens vazias contaminadas, provenientes do retorno devido a destinação dos resíduos em local ambientalmente adequado, deverá constar no veículo o(s) MTR(s) assinado(s) pelo(s) destino(s) final(is) referente à(s) respectiva(s)carga(s);',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'no caso de coleta e transporte de resíduos de agrotóxicos, como restos de produtos e suas respectivas embalagens vazias, assim como todos os materiais descartáveis utilizados na dosagem, diluição, preparação e aplicação dos agrotóxicos, o transportador deverá portar Autorização de Remessa de Resíduos para fora do Estado, emitida pela Fepam ao gerador ou ao armazenamento temporário, conforme Portaria FEPAM n.° 89 de 22/12/2016, publicada no DOE em 26/12/2016;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description: 'no caso de transporte de resíduos de serviços de saúde:',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: o compartimento de carga deve ser estanque de modo a evitar vazamentos,',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: é vedada, a compactação dos RSS Grupos A, B e E, e a utilização de veículos compactadores para e coleta e transporte destes grupos de resíduos;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: o transporte deve ser realizado de forma a não gerar odores durante seu trajeto até o destino final;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: realizar a higienização e desinfecção periódica dos veículos em local destinado para tal fim e com licença ambiental vigente.',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'quanto ao acondicionamento dos resíduos durante o transporte:',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'Quanto ao acondicionamento dos resíduos durante o transporte: os resíduos devem estar segregados segundo as suas características físicas, químicas, biológicas, o seu estado físico e os riscos envolvidos, com objetivo de reduzir a mistura de substâncias incompatíveis e acidentes durante o transporte;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'Quanto ao acondicionamento dos resíduos durante o transporte: os resíduos deverão ser transportados, da origem ao destinatário, em recipientes ou equipamentos que evitem derrames ou emanações gasosas, sob orientação do Responsável Técnico e de acordo com as normas da ABNT, devendo ser destinados em local devidamente licenciado para receber o tipo de resíduo em questão;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'Quanto ao acondicionamento dos resíduos durante o transporte: as embalagens contendo resíduos perigosos ou enquanto os recipientes estiverem contaminadas deverão estar individualmente identificadas, em bom estado de conservação, integras, com controle de vedação (tamponadas) e dispostas no veículo de forma segura durante todo o trajeto;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'Quanto ao acondicionamento dos resíduos durante o transporte: todos os recipientes de acondicionamento dos resíduos devem estar devidamente identificados. A identificação deverá conter, no mínimo, a identificação do gerador, da origem de geração, do resíduo, da classe, da quantidade, da data de geração e o contato do gerador em caso de emergência (ABNT NBR 16725:2014 e suas alterações);',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'Quanto ao acondicionamento dos resíduos durante o transporte: a identificação deve estar afixada em local de fácil visualização no recipiente de acondicionamento, de forma clara e legível;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'Quanto ao acondicionamento dos resíduos durante o transporte: deverá ser garantido que o tipo de acondicionamento dos resíduos providos pelo gerador é compatível com a unidade de transporte pretendido;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'Quanto ao acondicionamento dos resíduos durante o transporte: para o transporte de cargas fracionadas deverá ser utilizada embalagens homologadas pelo Inmetro ou entidade por este acreditada.',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'o transporte dos Resíduos deverá ser acompanhado do Manifesto de Transporte de Resíduos - MTR, emitido pelo gerador do resíduo, conforme o Art. 12 do Decreto Estadual nº 38.356 de 01/04/1998 e Portaria FEPAM n.º 087/2018, e suas alterações. O MTR deverá conter o n° ONU correspondente;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'os resíduos deverão ser transportados, da origem ao destinatário, em recipientes ou equipamentos que evitem derrames ou emanações gasosas, sob orientação do Responsável Técnico pela empresa e de acordo com as normas da ABNT, devendo ser destinados em local devidamente licenciado para receber o tipo de resíduo em questão;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'no caso de coleta e transporte de resíduos de agrotóxicos, como restos de produtos e suas respectivas embalagens vazias, assim como todos os materiais descartáveis utilizados na dosagem, diluição, preparação e aplicação dos agrotóxicos, o transportador deverá portar Autorização de Remessa de Resíduos para fora do Estado, emitida pela Fepam ao gerador ou ao armazenamento temporário, conforme Portaria FEPAM n.° 89 de 22/12/2016, publicada no DOE em 26/12/2016;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description: 'no caso de transporte de resíduos de serviços de saúde:',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: o compartimento de carga deve ser estanque de modo a evitar vazamentos,',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: é vedada, a compactação dos RSS Grupos A, B e E, e a utilização de veículos compactadores para e coleta e transporte destes grupos de resíduos;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: o transporte deve ser realizado de forma a não gerar odores durante seu trajeto até o destino final;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Resíduos Perigosos',
      description:
        'No caso de transporte de resíduos de serviços de saúde: realizar a higienização e desinfecção periódica dos veículos em local destinado para tal fim e com licença ambiental vigente.',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Área de Estacionamento',
      description:
        'quando o veículo não estiver em trânsito, estando ou não com carga, deve estar estacionado em local adequado, de forma a não gerar riscos ao meio ambiente e a saúde pública.',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Riscos Ambientais e Plano de Emergência',
      description:
        'a empresa deverá possuir protocolo de atendimento a emergência e manter treinamento de pessoal para o atendimento',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Riscos Ambientais e Plano de Emergência',
      description:
        'em situações de emergência o Responsável Técnico deverá atender e orientar de forma presencial sempre que demandado pelo órgão ambiental, a empresa e seus empregados em qualquer situação de emergência, dentro ou fora da empresa, visando evitar, minimizar e recuperar eventuais danos às populações, e ao meio ambiente.',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Riscos Ambientais e Plano de Emergência',
      description:
        'em caso de acidente, incidente ou sinistro com risco de danos a pessoas e/ou ao meio ambiente, é de responsabilidade do empreendedor e/ou do responsável técnico informar a Fepam imediatamente pelo telefone (51) 99982-7840;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Alteração de Frota',
      description:
        'com vistas à ALTERAÇÃO DE FROTA durante a vigência desta licença, o empreendedor deverá, através de seu responsável técnico, acessar o sistema on-line da FEPAM (SOL, www.fepam.rs.gov.br) e solicitar eletronicamente o pedido de DECLARAÇÃO DE ALTERAÇÃO DE FROTA, seguindo o Manual de Operação do Sistema. O pedido somente será analisado após o efetivo pagamento dos custos dos Serviços de Licenciamento Ambiental, conforme Resolução em vigor do Conselho de Administração;',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
    {
      environmentalDescriptor: 'Revenda',
      description:
        'Esta licença não autoriza a comercialização, distribuição, revenda e armazenamento dos produtos e/ou resíduos transportados. Devendo, portanto o empreendedor que realiza tal atividade possuir licenciamento e/ou autorizações relativas a cada atividade.',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      dueDate: null,
    },
  ],
  suggestedLegislations: [
    {
      legislation: {
        type: LegislationType.LEI,
        number: '9.077',
        year: 1990,
        issuingBody: 'Governo do Estado do Rio Grande do Sul',
        summary: 'Cria a Fundação Estadual de Proteção Ambiental.',
      },
      citedExcerpt:
        'A Fundação Estadual de Proteção Ambiental, criada pela Lei Estadual nº 9.077 de 04/06/90, registrada no Ofício do Registro Oficial em 01/02/91',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.LOW,
    },
    {
      legislation: {
        type: LegislationType.DECRETO,
        number: '51.761',
        year: 2014,
        issuingBody: 'Governo do Estado do Rio Grande do Sul',
        summary:
          'Aprova o Estatuto da Fundação Estadual de Proteção Ambiental.',
      },
      citedExcerpt:
        'e com seu Estatuto aprovado pelo Decreto nº 51.761, de 26/08/14, no uso das atribuições que lhe confere a Lei nº 6.938, de 31/08/81',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.LOW,
    },
    {
      legislation: {
        type: LegislationType.LEI,
        number: '6.938',
        year: 1981,
        issuingBody: 'Governo Federal',
        summary: 'Dispõe sobre a Política Nacional do Meio Ambiente.',
      },
      citedExcerpt:
        'no uso das atribuições que lhe confere a Lei nº 6.938, de 31/08/81, que dispõe sobre a Política Nacional do Meio Ambiente, regulamentada pelo Decreto nº 99.274, de 06/06/90',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.LOW,
    },
    {
      legislation: {
        type: LegislationType.DECRETO,
        number: '99.274',
        year: 1990,
        issuingBody: 'Governo Federal',
        summary:
          'Regulamenta a Lei nº 6.938, de 31/08/81, que dispõe sobre a Política Nacional do Meio Ambiente.',
      },
      citedExcerpt:
        'Lei nº 6.938, de 31/08/81, que dispõe sobre a Política Nacional do Meio Ambiente, regulamentada pelo Decreto nº 99.274, de 06/06/90',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.LOW,
    },
    {
      legislation: {
        type: LegislationType.RESOLUCAO,
        number: '5947',
        year: 2021,
        issuingBody: 'ANTT',
        summary: null,
      },
      citedExcerpt:
        'RESÍDUOS CLASSE I, conforme Resolução nº 5947, de 01/06/2021, da Agência Nacional de Transportes Terrestres - ANTT e normas NBR 10004 e NBR 13221, da ABNT.',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.HIGH,
    },
    {
      legislation: {
        type: LegislationType.PORTARIA,
        number: '15',
        year: 2019,
        issuingBody: 'SEMA - FEPAM',
        summary: null,
      },
      citedExcerpt:
        'no caso de alteração de titularidade, a mesma deverá ser solicitada via SOL e deverão ser seguidas as recomendações descritas na PORTARIA CONJUNTA SEMA - FEPAM Nº 15, de 03 de dezembro de 2019 e suas alterações',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.MODERATE,
    },
    {
      legislation: {
        type: LegislationType.LEI,
        number: '12.305',
        year: 2010,
        issuingBody: 'Governo Federal',
        summary: null,
      },
      citedExcerpt:
        'Categoria 18 | Código 18 - 74 | Descrição: Transporte de cargas perigosas - Lei nº 12.305/2010',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.HIGH,
    },
    {
      legislation: {
        type: LegislationType.DECRETO,
        number: '38.356',
        year: 1998,
        issuingBody: 'Governo do Estado do Rio Grande do Sul',
        summary: null,
      },
      citedExcerpt:
        'o transporte dos Resíduos deverá ser acompanhado do Manifesto de Transporte de Resíduos - MTR, emitido pelo gerador do resíduo, conforme o Art. 12 do Decreto Estadual nº 38.356 de 01/04/1998 e Portaria FEPAM n.º 087/2018, D.O.E. de 30/10/2018, e suas alterações.',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.HIGH,
    },
    {
      legislation: {
        type: LegislationType.PORTARIA,
        number: '087',
        year: 2018,
        issuingBody: 'FEPAM',
        summary: null,
      },
      citedExcerpt:
        'conforme o Art. 12 do Decreto Estadual nº 38.356 de 01/04/1998 e Portaria FEPAM n.º 087/2018, D.O.E. de 30/10/2018, e suas alterações. O MTR deverá conter o n° ONU correspondente;',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.HIGH,
    },
    {
      legislation: {
        type: LegislationType.PORTARIA,
        number: '89',
        year: 2016,
        issuingBody: 'FEPAM',
        summary: null,
      },
      citedExcerpt:
        'o transportador deverá portar Autorização de Remessa de Resíduos para fora do Estado, emitida pela Fepam ao gerador ou ao armazenamento temporário, conforme Portaria FEPAM n.° 89 de 22/12/2016, publicada no DOE em 26/12/2016;',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.HIGH,
    },
    {
      legislation: {
        type: LegislationType.OUTRO,
        number: '2.200-2',
        year: 2001,
        issuingBody: 'Governo Federal',
        summary:
          'Institui a infraestrutura de Chaves Públicas Brasileira - ICP-Brasil.',
      },
      citedExcerpt:
        'Documento eletrônico assinado digitalmente conforme MP nº 2.200-2/2001 de 24/08/2001, que institui a infraestrutura de Chaves Públicas Brasileira - ICP-Brasil.',
      source: LicenseLegislationSource.SCAN,
      impact: LegislationImpact.LOW,
    },
  ],
};

export function createDemoLicenseExtraction(): LicenseExtraction {
  return structuredClone(DEMO_LICENSE_EXTRACTION);
}
