import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";
import bcrypt from "bcryptjs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

const staffs = [
    {
        "agencia": null,
        "ativo": "sim",
        "banco": null,
        "celular": "1",
        "conta": null,
        "cpf": "105.324.458-48",
        "dt_entrada": "2023-02-02",
        "dt_nascimento": "2001-01-01",
        "email": null,
        "endereco": null,
        "forma_pagamento": "x",
        "id": 1,
        "integracao_embraer": null,
        "nome_abreviado": "ADAMAZILDO SOARES",
        "nome_completo": "ADAMAZILDO FERREIRA SOARES",
        "observacoes": "M",
        "pix": null,
        "rg": "20.346.567-2",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "sim",
        "banco": null,
        "celular": "19981407681",
        "conta": null,
        "cpf": "102.534.368-93 ",
        "dt_entrada": "2013-11-10",
        "dt_nascimento": "2001-01-01",
        "email": null,
        "endereco": null,
        "forma_pagamento": "PIX",
        "id": 2,
        "integracao_embraer": null,
        "nome_abreviado": "ADRIANO CALDAS",
        "nome_completo": "ADRIANO CALDAS",
        "observacoes": "BOMBEIRO",
        "pix": null,
        "rg": "20346159",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": "EMAIL",
        "ativo": "nao",
        "banco": "Nubank",
        "celular": "28999969375",
        "conta": null,
        "cpf": "128.213.247-40",
        "dt_entrada": "2025-02-19",
        "dt_nascimento": "1996-04-11",
        "email": "alcionedfreitas@gmail.com",
        "endereco": "Rua Doutor Shigeo Mori, 1568, Cidade Universitária, Campinas, São Paulo",
        "forma_pagamento": "PIX",
        "id": 3,
        "integracao_embraer": null,
        "nome_abreviado": "ALCIONE FREITAS",
        "nome_completo": "ALCIONE ALVES DE FREITAS",
        "observacoes": null,
        "pix": "alcionedfreitas@gmail.com",
        "rg": "3493505-ES",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "sim",
        "banco": null,
        "celular": "19989957575",
        "conta": null,
        "cpf": "376.830.408-60",
        "dt_entrada": null,
        "dt_nascimento": "1994-08-24",
        "email": null,
        "endereco": null,
        "forma_pagamento": null,
        "id": 4,
        "integracao_embraer": null,
        "nome_abreviado": "ALEXANDRE ETECHEBERE",
        "nome_completo": "ALEXANDRE ETECHEBERE",
        "observacoes": null,
        "pix": "37683040860",
        "rg": "43.191.711-5",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": "CPF",
        "ativo": "sim",
        "banco": null,
        "celular": "19988771977",
        "conta": null,
        "cpf": "162.405.898-10",
        "dt_entrada": "2024-11-08",
        "dt_nascimento": "1977-10-28",
        "email": "alexandreramaro@gmail.com",
        "endereco": "Av dos pioneiros 880 ap219, Santa Terezinha, Paulínia/SP CEP: 13140-798",
        "forma_pagamento": "PIX",
        "id": 5,
        "integracao_embraer": null,
        "nome_abreviado": "ALEXANDRE AMARO",
        "nome_completo": "ALEXANDRE RIOBO AMARO",
        "observacoes": "FEFE",
        "pix": "16240589810",
        "rg": "27.560.952-2",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "19988502855",
        "conta": null,
        "cpf": "32077742x",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": "alexandrescaquette@gmail.com",
        "endereco": null,
        "forma_pagamento": "PIX",
        "id": 6,
        "integracao_embraer": null,
        "nome_abreviado": "ALEXANDRE SCAQUETTE",
        "nome_completo": "ALEXANDRE SCAQUETTE",
        "observacoes": null,
        "pix": null,
        "rg": "31573572802",
        "tipo_conta": "19988502855",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "1",
        "conta": null,
        "cpf": "366.146.288-10",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": null,
        "endereco": null,
        "forma_pagamento": "x",
        "id": 7,
        "integracao_embraer": null,
        "nome_abreviado": "ALEXIS FRICK",
        "nome_completo": "ALEXIS MAXIMILIANO FRICK",
        "observacoes": null,
        "pix": null,
        "rg": "24.421.487-6",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "1",
        "conta": null,
        "cpf": "427.585.968-57",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": null,
        "endereco": "Rua Minas Gerais, 327 - Vila São João, Rio Grande da Serra - SP Cep 09450-000",
        "forma_pagamento": "x",
        "id": 8,
        "integracao_embraer": null,
        "nome_abreviado": "ALINE SILVA",
        "nome_completo": "ALINE APARECIDA DA SILVA",
        "observacoes": "ANINHA",
        "pix": null,
        "rg": "48.948.264-9",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "1992788288",
        "conta": null,
        "cpf": "1",
        "dt_entrada": null,
        "dt_nascimento": "1988-03-21",
        "email": null,
        "endereco": "R. PROF. FERREIRA LIMA, 555 - CID. UNIVERSITÁRIA - CAMPINAS / SP - CEP: 13083-220",
        "forma_pagamento": "x",
        "id": 9,
        "integracao_embraer": null,
        "nome_abreviado": "ALINE OLIVEIRA",
        "nome_completo": "ALINE SANCHES DE OLIVEIRA",
        "observacoes": "AMIGA HALANA",
        "pix": null,
        "rg": "1",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": "EMAIL",
        "ativo": "nao",
        "banco": "BRASIL",
        "celular": "12982355002",
        "conta": null,
        "cpf": "418.873.618-63",
        "dt_entrada": null,
        "dt_nascimento": "1995-07-13",
        "email": "contato@northbrasil.com.br",
        "endereco": "Rua Dr Alfredo Antônio martineli, 821 -Cidade Universitária -Campinas - SP, 13083-330",
        "forma_pagamento": "DEP.",
        "id": 10,
        "integracao_embraer": null,
        "nome_abreviado": "ALLAN MOREIRA",
        "nome_completo": "ALLAN JAMES MOREIRA",
        "observacoes": null,
        "pix": "52548-0",
        "rg": "38.133.761-3",
        "tipo_conta": "CC",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "sim",
        "banco": null,
        "celular": "19983282054",
        "conta": null,
        "cpf": "377.351.518-96",
        "dt_entrada": null,
        "dt_nascimento": "1993-05-05",
        "email": "amanda.gallofrancisco@gmail.com",
        "endereco": null,
        "forma_pagamento": null,
        "id": 11,
        "integracao_embraer": null,
        "nome_abreviado": "AMANDA FRANCISCO",
        "nome_completo": "AMANDA GALLO FRANCISCO",
        "observacoes": null,
        "pix": null,
        "rg": "43.910.264-9",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": "0860",
        "ativo": "nao",
        "banco": "CAIXA",
        "celular": "19974185225",
        "conta": null,
        "cpf": "441.161.688-23",
        "dt_entrada": null,
        "dt_nascimento": "1995-09-28",
        "email": null,
        "endereco": null,
        "forma_pagamento": "DEP.",
        "id": 12,
        "integracao_embraer": null,
        "nome_abreviado": "AMANDA RODRIGUES",
        "nome_completo": "AMANDA SILVA RODRIGUES",
        "observacoes": null,
        "pix": "00055991-0 OP 013",
        "rg": "40.582.783-0",
        "tipo_conta": "CP",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "19988343429",
        "conta": null,
        "cpf": "39981128-X",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": "anabergamin@hotmail.com",
        "endereco": null,
        "forma_pagamento": "PIX",
        "id": 13,
        "integracao_embraer": null,
        "nome_abreviado": "ANA VALÉRIO",
        "nome_completo": "ANA CAROLINA BERGAMIN VALÉRIO",
        "observacoes": null,
        "pix": null,
        "rg": "43130731830",
        "tipo_conta": "43130731830",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "13997077702",
        "conta": null,
        "cpf": "42.725.2067-6",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": "carolcederboom@gmail.com",
        "endereco": null,
        "forma_pagamento": "PIX",
        "id": 14,
        "integracao_embraer": null,
        "nome_abreviado": "ANA MUNIZ",
        "nome_completo": "ANA CAROLINA CEDERBOOM MUNIZ",
        "observacoes": null,
        "pix": null,
        "rg": "306.369.608-03",
        "tipo_conta": "13997077702",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "1",
        "conta": null,
        "cpf": "2",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": null,
        "endereco": null,
        "forma_pagamento": "x",
        "id": 15,
        "integracao_embraer": null,
        "nome_abreviado": "ANA PASOTTI",
        "nome_completo": "ANA CAROLINA PASOTTI",
        "observacoes": null,
        "pix": null,
        "rg": "48.420.454-3",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "11975429321",
        "conta": null,
        "cpf": "448549827",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": "anaclara.psmo@hotmail.com",
        "endereco": null,
        "forma_pagamento": "PIX",
        "id": 16,
        "integracao_embraer": null,
        "nome_abreviado": "ANA OLIVEIRA",
        "nome_completo": "ANA CLARA P. S. M. OLIVEIRA",
        "observacoes": "INDICAÇÃO GI",
        "pix": null,
        "rg": "32015243879",
        "tipo_conta": "11975429321",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "sim",
        "banco": null,
        "celular": "19995995433",
        "conta": null,
        "cpf": "402.590.188-99",
        "dt_entrada": "2021-10-02",
        "dt_nascimento": "1997-03-14",
        "email": "analuisapigatto@gmail.com",
        "endereco": "Rua Carmelito Leme, 147, Vila Santa Isabel, Campinas/SP, CEP: 13084-609",
        "forma_pagamento": "PIX",
        "id": 17,
        "integracao_embraer": null,
        "nome_abreviado": "ANA BORBA",
        "nome_completo": "ANA LUISA PIGATTO DE BORBA",
        "observacoes": "INDICAÇÃO GABRIEL AUGUSTO MENDES",
        "pix": "19995995433",
        "rg": "37.644.399-6",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "54996698179",
        "conta": null,
        "cpf": "485.198.848-65",
        "dt_entrada": null,
        "dt_nascimento": "1999-03-26",
        "email": "projetos@northbrasil.com.br",
        "endereco": "R. Dr. Shigeo Mori, 1887 - Cidade Universitária, CAMPINAS/SP, 13083-770",
        "forma_pagamento": "PIX",
        "id": 18,
        "integracao_embraer": null,
        "nome_abreviado": "ANA AZZOLINI",
        "nome_completo": "ANA LUIZA AZZOLINI",
        "observacoes": "Analuzzolini@gmail.com",
        "pix": null,
        "rg": "39.919.885-4",
        "tipo_conta": "(54) 99669-8179",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": "Nubank",
        "celular": "11981626375",
        "conta": null,
        "cpf": "324.139.298-86",
        "dt_entrada": null,
        "dt_nascimento": "1973-07-07",
        "email": "nogueira.apaula@yahoo.com.br",
        "endereco": "Rua Ione Azevedo Barros de Camargo,317",
        "forma_pagamento": "PIX",
        "id": 19,
        "integracao_embraer": null,
        "nome_abreviado": "ANA NOGUEIRA",
        "nome_completo": "ANA PAULA NOGUEIRA",
        "observacoes": null,
        "pix": "11981626375",
        "rg": "45.432.294-X",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": "9231",
        "ativo": "nao",
        "banco": "ITAÚ",
        "celular": "11981589068",
        "conta": null,
        "cpf": "083.167.518-79",
        "dt_entrada": null,
        "dt_nascimento": "1964-02-06",
        "email": null,
        "endereco": null,
        "forma_pagamento": "TRANS.",
        "id": 20,
        "integracao_embraer": null,
        "nome_abreviado": "ANA PERON",
        "nome_completo": "ANA PAULA PERON",
        "observacoes": null,
        "pix": "00125-7",
        "rg": "11045000",
        "tipo_conta": "CC",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "sim",
        "banco": "CELULAR",
        "celular": "(11) 975135521",
        "conta": null,
        "cpf": "474.452.908-93",
        "dt_entrada": "2025-09-17",
        "dt_nascimento": "2006-07-20",
        "email": "anaserena.asb@gmail.com",
        "endereco": "Avenida Engenheiro Eusebio Stevaux 1000, Jurubatuba, Cidade São Paulo/SP, CEP: 04696-000",
        "forma_pagamento": null,
        "id": 21,
        "integracao_embraer": null,
        "nome_abreviado": "ANA BRANDÃO",
        "nome_completo": "ANA SERENA ARAI SOARES BRANDÃO",
        "observacoes": null,
        "pix": "11 975135521",
        "rg": "50.543.299-7",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "1",
        "conta": null,
        "cpf": "383.106.478-40",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": "andreandere@gmail.com",
        "endereco": null,
        "forma_pagamento": "x",
        "id": 22,
        "integracao_embraer": null,
        "nome_abreviado": "ANDRÉ ANDERE",
        "nome_completo": "ANDRÉ ANDERE",
        "observacoes": "Serial: NHQEYAL005239011F69Z00",
        "pix": null,
        "rg": "46.012.853-X",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "sim",
        "banco": null,
        "celular": "11943269347",
        "conta": null,
        "cpf": "163.391.588-38",
        "dt_entrada": "2021-10-02",
        "dt_nascimento": "1974-12-03",
        "email": "absbrandao@gmail.com",
        "endereco": "Avenida Antônio Pincinato, 1700, casa 9, Recanto Quarto Centenário, Jundiaí, São Paulo, CEP: 13211-771",
        "forma_pagamento": "x",
        "id": 23,
        "integracao_embraer": "SIM (CONTRATO STEFANINI)",
        "nome_abreviado": "ANDRÉ BRANDÃO",
        "nome_completo": "ANDRÉ BORGES SOARES BRANDÃO",
        "observacoes": "COMPUTADOR Modelo: Acer NITRO 5 Serial: NHQEYAL005239011F69Z00",
        "pix": null,
        "rg": "18.967.343-6",
        "tipo_conta": null,
        "vencimento_aso": "2026-05-13",
        "vencimento_contrato": "2026-04-20"
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "1",
        "conta": null,
        "cpf": "395.326.438-93",
        "dt_entrada": null,
        "dt_nascimento": "1990-01-23",
        "email": null,
        "endereco": null,
        "forma_pagamento": "x",
        "id": 24,
        "integracao_embraer": null,
        "nome_abreviado": "ANDRÉ FELIPPE",
        "nome_completo": "ANDRÉ FELIPPE",
        "observacoes": null,
        "pix": null,
        "rg": "46.623.699-2",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": "188",
        "ativo": "sim",
        "banco": "ITAÚ",
        "celular": "11991407062",
        "conta": null,
        "cpf": "438.973.468-77",
        "dt_entrada": "2021-10-01",
        "dt_nascimento": "1993-12-07",
        "email": "andreluisbcorrea@gmail.com",
        "endereco": "Rua Virgílio Dalben, 15B, Barão Geraldo, Campinas, São Paulo, CEP: 18084-779,",
        "forma_pagamento": "TRANS.",
        "id": 25,
        "integracao_embraer": "SIM (CONTRATO EMBRAER)",
        "nome_abreviado": "ANDRÉ CORRÊA",
        "nome_completo": "ANDRÉ LUIS BARRETO CORRÊA",
        "observacoes": "AMIGO LUIZA",
        "pix": "0997-2",
        "rg": "38.855.229-3",
        "tipo_conta": "CC",
        "vencimento_aso": "2026-03-30",
        "vencimento_contrato": "2025-10-15"
    },
    {
        "agencia": "2447-3",
        "ativo": "nao",
        "banco": "BRASIL",
        "celular": "19993963431",
        "conta": null,
        "cpf": "400.290.668-08",
        "dt_entrada": null,
        "dt_nascimento": "1996-01-14",
        "email": null,
        "endereco": null,
        "forma_pagamento": "DEP.",
        "id": 26,
        "integracao_embraer": null,
        "nome_abreviado": "ANDRÉ FURQUIM",
        "nome_completo": "ANDRÉ LUIS FURQUIM",
        "observacoes": "BIA - AMCHAM",
        "pix": "54642-9",
        "rg": "43.442.008-6",
        "tipo_conta": "CC:",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "65984179746",
        "conta": null,
        "cpf": "82018590",
        "dt_entrada": null,
        "dt_nascimento": "2001-01-01",
        "email": "andre.marcon.16@gmail.com",
        "endereco": null,
        "forma_pagamento": "PIX",
        "id": 27,
        "integracao_embraer": null,
        "nome_abreviado": "ANDRÉ MARCON",
        "nome_completo": "ANDRÉ LUÍS SAGIORATO MARCON",
        "observacoes": null,
        "pix": null,
        "rg": "04701831956",
        "tipo_conta": "047.018.319-56",
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "98535878",
        "conta": null,
        "cpf": "430.595.198-38",
        "dt_entrada": null,
        "dt_nascimento": "1989-04-25",
        "email": "de_lsm@hotmail.com",
        "endereco": "R. PASCHOAL DE LUCCA,360- CASA 55 JD SÃO PEDRO -CPS",
        "forma_pagamento": "x",
        "id": 28,
        "integracao_embraer": null,
        "nome_abreviado": "ANDRE MATHEUS",
        "nome_completo": "ANDRE LUIZ DOS SANTOS MATHEUS",
        "observacoes": null,
        "pix": null,
        "rg": "49.530.265-X",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": null,
        "celular": "1992034222",
        "conta": null,
        "cpf": "348.209.648-10",
        "dt_entrada": null,
        "dt_nascimento": "1987-02-27",
        "email": null,
        "endereco": null,
        "forma_pagamento": "x",
        "id": 29,
        "integracao_embraer": null,
        "nome_abreviado": "ANDRÉ CAMARGO",
        "nome_completo": "ANDRÉ MIRANDA DE CAMARGO",
        "observacoes": null,
        "pix": null,
        "rg": "41.312.479-4",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "agencia": null,
        "ativo": "nao",
        "banco": "Nubank",
        "celular": "11964816564",
        "conta": null,
        "cpf": "476.065.898-01",
        "dt_entrada": null,
        "dt_nascimento": "1999-11-03",
        "email": "andrezzapprado@gmail.com",
        "endereco": "Rua Roxo Moreira, 601",
        "forma_pagamento": "PIX",
        "id": 30,
        "integracao_embraer": null,
        "nome_abreviado": "ANDREZZA BRITO",
        "nome_completo": "ANDREZZA PRADO DE BRITO",
        "observacoes": null,
        "pix": "11964816564",
        "rg": "57.138.471-7",
        "tipo_conta": null,
        "vencimento_aso": null,
        "vencimento_contrato": null
    },
    {
        "id": 31, "nome_abreviado": "ANGELO MASIERO", "nome_completo": "ANGELO RICARDO MASIERO", "ativo": "nao", "cpf": "344.268.518-40"
    },
    {
        "id": 32, "nome_abreviado": "ARIEL CARDOSO", "nome_completo": "ARIEL AUGUSTO SANTORO CARDOSO", "ativo": "nao", "cpf": "420.455.878-00"
    },
    {
        "id": 33, "nome_abreviado": "ARIEL MORAES", "nome_completo": "ARIEL KEGLEVICH MORAES", "ativo": "nao", "cpf": "125.544.926-89"
    },
    {
        "id": 34, "nome_abreviado": "ARIEL SOARES", "nome_completo": "ARIEL MONTEIRO SOARES", "ativo": "nao", "cpf": "438.150.698-74"
    },
    {
        "id": 35, "nome_abreviado": "BEATRIZ PAGANINI", "nome_completo": "BEATRIZ PAGANINI", "ativo": "nao", "cpf": "425.166.618-37"
    },
    {
        "id": 36, "nome_abreviado": "BEATRIZ FIGUEIREDO", "nome_completo": "BEATRIZ SOLEDAD MERINO FIGUEIREDO", "ativo": "nao", "cpf": "450.934.568-29"
    },
    {
        "id": 37, "nome_abreviado": "BIANCA FERRAGUTTI", "nome_completo": "BIANCA C. FERRAGUTTI", "ativo": "nao", "cpf": "310.850.448-74"
    },
    {
        "id": 38, "nome_abreviado": "BIANCA AUGUSTO", "nome_completo": "BIANCA TOMAZIN AUGUSTO", "ativo": "nao", "cpf": "425.182.728-79"
    },
    {
        "id": 39, "nome_abreviado": "BRUNA MURBACH", "nome_completo": "BRUNA CRISTINA SILVA MURBACH", "ativo": "nao", "cpf": "383.168.058-20"
    },
    {
        "id": 40, "nome_abreviado": "BRUNO NETO", "nome_completo": "BRUNO BAKAUKAS NETO", "ativo": "nao", "cpf": "122.601.398-84"
    },
    {
        "id": 41, "nome_abreviado": "BRUNO FUKAI", "nome_completo": "BRUNO MARCOS FUKAI", "ativo": "nao", "cpf": "329.506.388-56"
    },
    {
        "id": 42, "nome_abreviado": "BRUNO CAMARGO", "nome_completo": "BRUNO RACHED SIQUEIRA CAMARGO", "ativo": "nao", "cpf": "352.793.048-59"
    },
    {
        "id": 43, "nome_abreviado": "BRUNO GUSMAN", "nome_completo": "BRUNO SOARES GUSMAN", "ativo": "nao", "cpf": "379.149.848-76"
    },
    {
        "id": 44, "nome_abreviado": "CAIO PATUTTI", "nome_completo": "CAIO PATUTTI", "ativo": "nao", "cpf": "391.538.048-21"
    },
    {
        "id": 45, "nome_abreviado": "CAIO NUNES", "nome_completo": "CAIO RODRIGUES NUNES", "ativo": "nao", "cpf": "424-708-448-86"
    },
    {
        "id": 46, "nome_abreviado": "CAMBISES ALVES", "nome_completo": "CAMBISES BISTRICKY ALVES", "ativo": "sim", "cpf": "070.956.058-31", "celular": "19963336494", "vencimento_aso": "2026-02-09"
    },
    {
        "id": 47, "nome_abreviado": "CAMILA NORDER", "nome_completo": "CAMILA MAURER NORDER", "ativo": "nao", "cpf": "351.471.508-46"
    },
    {
        "id": 48, "nome_abreviado": "CARLA FERREIRA", "nome_completo": "CARLA MELO DE OLIVEIRA FERREIRA", "ativo": "nao", "cpf": "35005252886"
    },
    {
        "id": 49, "nome_abreviado": "CARLOS JR", "nome_completo": "CARLOS ALBERTO FERREIRA JR", "ativo": "nao", "cpf": "412.470.268-09"
    },
    {
        "id": 50, "nome_abreviado": "CARLOS JUNIOR", "nome_completo": "CARLOS PEDRO ANTUNES JUNIOR", "ativo": "sim", "cpf": "150.018.588.44"
    },
    {
        "id": 51, "nome_abreviado": "CAROLINA VENÂNCIO", "nome_completo": "CAROLINA BARBOSA AMADO VENÂNCIO", "ativo": "nao", "cpf": "410.428.238-39"
    },
    {
        "id": 52, "nome_abreviado": "CAROLINA PAVAN", "nome_completo": "CAROLINA DE SOUZA PAVAN", "ativo": "nao", "cpf": "45246004856", "celular": "19995735230"
    },
    {
        "id": 53, "nome_abreviado": "CAROLINA FERDINANDO", "nome_completo": "CAROLINA KELM FERDINANDO", "ativo": "nao", "cpf": "439.561.988-67"
    },
    {
        "id": 54, "nome_abreviado": "CAROLINE SOARES", "nome_completo": "CAROLINE DA SILVA SOARES", "ativo": "nao", "cpf": "407.613.318-83"
    },
    {
        "id": 55, "nome_abreviado": "CECILIA GRASSI", "nome_completo": "CECILIA GRASSI", "ativo": "nao", "cpf": "3"
    },
    {
        "id": 56, "nome_abreviado": "CÉSAR SANTOS", "nome_completo": "CÉSAR AUGUSTO DA SILVA SANTOS", "ativo": "nao", "cpf": "464.314.198-04"
    },
    {
        "id": 57, "nome_abreviado": "CÉSAR BONFIM", "nome_completo": "CÉSAR AUGUSTO SACILOTTO BONFIM", "ativo": "sim", "cpf": "219.332.768-86", "celular": "19991427963"
    },
    {
        "id": 58, "nome_abreviado": "CHANTRELLE WRONSKI", "nome_completo": "CHANTRELLE ZORZO WRONSKI", "ativo": "nao", "cpf": "080.625.539-06"
    },
    {
        "id": 59, "nome_abreviado": "CHRISTIAN BARROS", "nome_completo": "CHRISTIAN LUAN APARECIDO LOPES DE BARROS", "ativo": "nao", "cpf": "365.048.308-43"
    },
    {
        "id": 60, "nome_abreviado": "DAIANE BERTO", "nome_completo": "DAIANE PESSOA BERTO", "ativo": "nao", "cpf": "339.173.268-76"
    },
    {
        "id": 61, "nome_abreviado": "DAMIAN PALUMBO", "nome_completo": "DAMIAN IGNACIO PALUMBO", "ativo": "nao", "cpf": "370.332.788-02"
    },
    {
        "id": 62, "nome_abreviado": "DANIEL MODA", "nome_completo": "DANIEL AUGUSTO MODA", "ativo": "nao", "cpf": "455.941.018-61"
    },
    {
        "id": 63, "nome_abreviado": "DANIEL COCCO", "nome_completo": "DANIEL ROTELLA COCCO", "ativo": "nao", "cpf": "342.848.168-29"
    },
    {
        "id": 64, "nome_abreviado": "DANIELA BERGL", "nome_completo": "DANIELA LIBERTINI BERGL", "ativo": "nao", "cpf": "268535243"
    },
    {
        "id": 65, "nome_abreviado": "DANIELE BRITO", "nome_completo": "DANIELE TRAVESSA BRITO", "ativo": "nao", "cpf": "218.916.778-70"
    },
    {
        "id": 66, "nome_abreviado": "DAPHNE CENTENORIO", "nome_completo": "DAPHNE NICOLY RAFAEL CENTENORIO", "ativo": "sim", "cpf": "475.425.508-96", "celular": "14996386004"
    },
    {
        "id": 67, "nome_abreviado": "DEBORA ALVES", "nome_completo": "DEBORA DE AGUIAR ALVES", "ativo": "sim", "cpf": "490.017.888-82", "celular": "11985684529"
    },
    {
        "id": 68, "nome_abreviado": "DIEGO RIBEIRO", "nome_completo": "DIEGO DOS SANTOS RIBEIRO", "ativo": "nao", "cpf": "415.934.328-79"
    },
    {
        "id": 69, "nome_abreviado": "DIEGO FERNANDES", "nome_completo": "DIEGO FERNANDES", "ativo": "nao", "cpf": "311.396.828-30"
    },
    {
        "id": 70, "nome_abreviado": "DIEGO GAMERO", "nome_completo": "DIEGO HENRIQUE GAMERO", "ativo": "nao", "cpf": "4"
    },
    {
        "id": 71, "nome_abreviado": "DIEGO CARVALHO", "nome_completo": "DIEGO JORGE MENEZES CARVALHO", "ativo": "nao", "cpf": "5"
    },
    {
        "id": 72, "nome_abreviado": "DIEGO SILVA", "nome_completo": "DIEGO LOPES DA SILVA", "ativo": "nao", "cpf": "463.842.408.23"
    },
    {
        "id": 73, "nome_abreviado": "DOUGLAS PIO", "nome_completo": "DOUGLAS DE OLIVEIRA PIO", "ativo": "nao", "cpf": "500.633.188-73"
    },
    {
        "id": 74, "nome_abreviado": "EDMUR FILHO", "nome_completo": "EDMUR FERREIRA DE C. FILHO", "ativo": "nao", "cpf": "031.124.468-87"
    },
    {
        "id": 75, "nome_abreviado": "EDSON FARIA", "nome_completo": "EDSON NASCIMENTO DOS SANTOS FARIA", "ativo": "nao", "cpf": "369.877.408-95"
    },
    {
        "id": 76, "nome_abreviado": "EDUARDO RIBEIRO", "nome_completo": "EDUARDO DA SILVA RIBEIRO", "ativo": "nao", "cpf": "351.715.938-76"
    },
    {
        "id": 77, "nome_abreviado": "EDUARDO ANDREO", "nome_completo": "EDUARDO SILVIO ANDREO", "ativo": "nao", "cpf": "245.800.408-30"
    },
    {
        "id": 78, "nome_abreviado": "ELAINE FERREIRA", "nome_completo": "ELAINE CRISTINA FERREIRA", "ativo": "nao", "cpf": "304348661"
    },
    {
        "id": 79, "nome_abreviado": "ELISA NERY", "nome_completo": "ELISA AZEVEDO DE ANDRADE NERY", "ativo": "sim", "cpf": "395.391.778-12", "celular": "19981962788", "vencimento_aso": "2026-08-03"
    },
    {
        "id": 80, "nome_abreviado": "ENZO CHUMPATO", "nome_completo": "ENZO ALVES HORTÊNCIO CHUMPATO", "ativo": "nao", "cpf": "471.883.808-80"
    },
    {
        "id": 81, "nome_abreviado": "EVANDRO CASTRO", "nome_completo": "EVANDRO RODRIGUES CASTRO", "ativo": "nao", "cpf": "464.934.708-46"
    },
    {
        "id": 82, "nome_abreviado": "FABIANA GERMAMO", "nome_completo": "FABIANA CRISTINA LOPES GERMAMO", "ativo": "sim", "cpf": "275.782.288-89", "vencimento_aso": "2026-02-04"
    },
    {
        "id": 83, "nome_abreviado": "FABIO FUKUMOTO", "nome_completo": "FABIO AKIO FUKUMOTO", "ativo": "nao", "cpf": "6"
    },
    {
        "id": 84, "nome_abreviado": "FÁBIO LUCA", "nome_completo": "FÁBIO BUAINAIN DE LUCA", "ativo": "sim", "cpf": "223.102.738-05", "vencimento_aso": "2026-03-30"
    },
    {
        "id": 85, "nome_abreviado": "FABIO JUNIOR", "nome_completo": "FABIO FLAITT JUNIOR", "ativo": "nao", "cpf": "467.270.018-63"
    },
    {
        "id": 86, "nome_abreviado": "FELIPE ROCHA", "nome_completo": "FELIPE FAGNANI ROCHA", "ativo": "nao", "cpf": "337.179.548-90"
    },
    {
        "id": 87, "nome_abreviado": "FELIPE OLIVEIRA", "nome_completo": "FELIPE FONSECA RODRIGUES OLIVEIRA", "ativo": "nao", "cpf": "327.160.228-01"
    },
    {
        "id": 88, "nome_abreviado": "FELIPE ALMEIDA", "nome_completo": "FELIPE MACHADO DE ALMEIDA", "ativo": "nao", "cpf": "055.146.123-33"
    },
    {
        "id": 89, "nome_abreviado": "FELIPE MICHELONE", "nome_completo": "FELIPE PERES MICHELONE", "ativo": "nao", "cpf": "417.756.308-03"
    },
    {
        "id": 90, "nome_abreviado": "FERNANDA CORRÊA", "nome_completo": "FERNANDA CHAURAIS CORRÊA", "ativo": "nao", "cpf": "393.870.048-30"
    },
    {
        "id": 91, "nome_abreviado": "FERNANDO PEREIRA", "nome_completo": "FERNANDO DA SILVA PEREIRA", "ativo": "sim", "cpf": "419.400.718-28"
    },
    {
        "id": 92, "nome_abreviado": "FERNANDO NICCHIO", "nome_completo": "FERNANDO HENRIQUE VELAME NICCHIO", "ativo": "sim", "cpf": "390.900.928-03", "celular": "11982630550"
    },
    {
        "id": 93, "nome_abreviado": "FERNANDO SAITO", "nome_completo": "FERNANDO HIRO FERREIRA SAITO", "ativo": "nao", "cpf": "398.604.058-75"
    },
    {
        "id": 94, "nome_abreviado": "FERNANDO OLIVEIRA", "nome_completo": "FERNANDO ROBERTO GARCIA DE OLIVEIRA", "ativo": "nao", "cpf": "300.880.048-30"
    },
    {
        "id": 95, "nome_abreviado": "FILIPE NISHIKAWA", "nome_completo": "FILIPE AKYO NISHIKAWA", "ativo": "nao", "cpf": "369.652.818-80"
    },
    {
        "id": 96, "nome_abreviado": "FRANCIS LIMA", "nome_completo": "FRANCIS CHAGAS DE LIMA", "ativo": "nao", "cpf": "413.998.538-05"
    },
    {
        "id": 97, "nome_abreviado": "FRANCISCO ARIZA", "nome_completo": "FRANCISCO BUENO DE ARAUJO ARIZA", "ativo": "nao", "cpf": "413.393.548-96"
    },
    {
        "id": 98, "nome_abreviado": "GABRIEL MENDES", "nome_completo": "GABRIEL AUGUSTO CAMPOS MENDES", "ativo": "nao", "cpf": "464.919.628-06"
    },
    {
        "id": 99, "nome_abreviado": "GABRIEL JOAQUIM", "nome_completo": "GABRIEL AUGUSTO VIVEIROS JOAQUIM", "ativo": "nao", "cpf": "353.720.398-50"
    },
    {
        "id": 100, "nome_abreviado": "GABRIEL MOURA", "nome_completo": "GABRIEL DE SOUZA MOURA", "ativo": "nao", "cpf": "453.793.268-62"
    },
    {
        "id": 101, "nome_abreviado": "GABRIEL SILVA", "nome_completo": "GABRIEL MAXIMINO DE OLIVEIRA DA SILVA", "ativo": "nao", "cpf": "539.700.378-67"
    },
    {
        "id": 102, "nome_abreviado": "GABRIEL FERRAZ", "nome_completo": "GABRIEL PERCIAVALLE FERRAZ", "ativo": "nao", "cpf": "441.507.618-17"
    },
    {
        "id": 103, "nome_abreviado": "GABRIEL SEIXAS", "nome_completo": "GABRIEL RIBEIRO SEIXAS", "ativo": "nao", "cpf": "458.898.828.05"
    },
    {
        "id": 104, "nome_abreviado": "GABRIEL OLIVEIRA", "nome_completo": "GABRIEL VICTOR TOFANI TREVIZANI BARBOSA E OLIVEIRA", "ativo": "nao", "cpf": "440.878.038-30"
    },
    {
        "id": 105, "nome_abreviado": "GABRIELA MELO", "nome_completo": "GABRIELA BERGAMASCHI MELO", "ativo": "nao", "cpf": "462.992.418-37"
    },
    {
        "id": 106, "nome_abreviado": "GEORGE PAIVA", "nome_completo": "GEORGE EDUARDO PINTO PAIVA", "ativo": "nao", "cpf": "433.031.258-13"
    },
    {
        "id": 107, "nome_abreviado": "GIOVANNA ROMANO", "nome_completo": "GIOVANNA ANDREO ROMANO", "ativo": "sim", "cpf": "399.116.668-24", "celular": "19996256335", "vencimento_aso": "2026-06-08", "vencimento_contrato": "2026-04-14"
    },
    {
        "id": 108, "nome_abreviado": "GIULIA ANDREOLI", "nome_completo": "GIULIA MERCANTE NADDEO ANDREOLI", "ativo": "nao", "cpf": "442.441.848-05"
    },
    {
        "id": 109, "nome_abreviado": "GIULIA VALLI", "nome_completo": "GIULIA TONATO VALLI", "ativo": "nao", "cpf": "503119131"
    },
    {
        "id": 110, "nome_abreviado": "GLAUCIA GHIRARDINI", "nome_completo": "GLAUCIA REGINA STIVAL GHIRARDINI", "ativo": "sim", "cpf": "327.871.358-38", "celular": "14997865876", "vencimento_aso": "2026-10-30"
    },
    {
        "id": 111, "nome_abreviado": "GUILHERME BUZAID", "nome_completo": "GUILHERME BARCELLOS BUZAID", "ativo": "sim", "cpf": "438.501.738-79", "celular": "17981682134"
    },
    {
        "id": 112, "nome_abreviado": "GUILHERME", "nome_completo": "GUILHERME FEITOSA CAMILO", "ativo": "nao", "cpf": "419.877.948-18"
    },
    {
        "id": 113, "nome_abreviado": "GUILHERME", "nome_completo": "GUILHERME FIORI MAGINADOR", "ativo": "nao", "cpf": "217.903.908-50"
    },
    {
        "id": 114, "nome_abreviado": "GUSTAVO SILVA", "nome_completo": "GUSTAVO ALVES DA SILVA", "ativo": "sim", "cpf": "424753.558-75", "celular": "19996291864", "vencimento_contrato": "2030-01-28"
    },
    {
        "id": 115, "nome_abreviado": "GUSTAVO LOPES", "nome_completo": "GUSTAVO DE OLIVEIRA LOPES", "ativo": "nao", "cpf": "498.895.418-82"
    },
    {
        "id": 116, "nome_abreviado": "GUSTAVO HIGA", "nome_completo": "GUSTAVO SAKUMOTO HIGA", "ativo": "nao", "cpf": "414.708.228-90"
    },
    {
        "id": 117, "nome_abreviado": "GUSTAVO COSTA", "nome_completo": "GUSTAVO TREVISAN COSTA", "ativo": "nao", "cpf": "407.032.038-51"
    },
    {
        "id": 118, "nome_abreviado": "GUSTAVO VOLPATO", "nome_completo": "GUSTAVO VERONEZI VOLPATO", "ativo": "nao", "cpf": "486.434.358-64"
    },
    {
        "id": 119, "nome_abreviado": "HALANA OLIVEIRA", "nome_completo": "HALANA INGRID OLIVEIRA", "ativo": "nao", "cpf": "103.377.409-09", "vencimento_aso": "2026-02-25"
    },
    {
        "id": 120, "nome_abreviado": "HELENA RANGEL", "nome_completo": "HELENA NORKING RANGEL", "ativo": "nao", "cpf": "436.428.828-46"
    },
    {
        "id": 121, "nome_abreviado": "HELOISA SALES", "nome_completo": "HELOISA LOPES SALES", "ativo": "nao", "cpf": "483.876.298-47"
    },
    {
        "id": 122, "nome_abreviado": "HENRIQUE BÜLL", "nome_completo": "HENRIQUE CARVALHINHO BÜLL", "ativo": "nao", "cpf": "410.186.148-00"
    },
    {
        "id": 123, "nome_abreviado": "HENRIQUE DOSTAL", "nome_completo": "HENRIQUE SILVA DOSTAL", "ativo": "nao", "cpf": "362.597.868-75"
    },
    {
        "id": 124, "nome_abreviado": "IAN ARCAS", "nome_completo": "IAN ARCAS", "ativo": "nao", "cpf": "326.797.978-17"
    },
    {
        "id": 125, "nome_abreviado": "ICARO FERREIRA", "nome_completo": "ICARO GONÇALEZ FERREIRA", "ativo": "nao", "cpf": "1970270"
    },
    {
        "id": 126, "nome_abreviado": "IGOR PINTO", "nome_completo": "IGOR CAUE VIEIRA DE OLIVEIRA PINTO", "ativo": "nao", "cpf": "403.217.288-90"
    },
    {
        "id": 127, "nome_abreviado": "ISABELA", "nome_completo": "ISABELA VIRGÍNIA SESTARI", "ativo": "nao", "cpf": "7"
    },
    {
        "id": 128, "nome_abreviado": "ISABELLA MARÇAL", "nome_completo": "ISABELLA FERNANDA DE OLIVEIRA MARÇAL", "ativo": "nao", "cpf": "8"
    },
    {
        "id": 129, "nome_abreviado": "JEAN MANTOVANI", "nome_completo": "JEAN DOS SANTOS MANTOVANI", "ativo": "nao", "cpf": "425.696.558-05"
    },
    {
        "id": 130, "nome_abreviado": "JENNER BUENO", "nome_completo": "JENNER BREDARIOL BUENO", "ativo": "nao", "cpf": "446.846.608-18"
    },
    {
        "id": 131, "nome_abreviado": "JÉSSICA MILLESOLI", "nome_completo": "JÉSSICA OLIVEIRA DE MELO MILLESOLI", "ativo": "nao", "cpf": "405.654.388-75"
    },
    {
        "id": 132, "nome_abreviado": "JOÃO CAFÉ", "nome_completo": "JOÃO DANIEL CAFÉ", "ativo": "nao", "cpf": "382.132.128-86"
    },
    {
        "id": 133, "nome_abreviado": "JOÃO OLIVEIRA", "nome_completo": "JOÃO PEDRO PEREIRA SILVA MARQUES DE OLIVEIRA", "ativo": "nao", "cpf": "392605739"
    },
    {
        "id": 134, "nome_abreviado": "JOSÉ BETTINI", "nome_completo": "JOSÉ ANSELMO BETTINI", "ativo": "sim", "cpf": "004.872.808-06"
    },
    {
        "id": 135, "nome_abreviado": "JOSÉ DEFAVARI", "nome_completo": "JOSÉ RENATO DEFAVARI", "ativo": "sim", "cpf": "075.051.188-54", "celular": "19998417271", "vencimento_aso": "2026-05-08", "vencimento_contrato": "2026-04-14"
    },
    {
        "id": 136, "nome_abreviado": "JOSÉ JUNIOR", "nome_completo": "JOSÉ ROBERTO PASOTTI JUNIOR", "ativo": "nao", "cpf": "393.057.268-01"
    },
    {
        "id": 137, "nome_abreviado": "JOSIMAR GOMES", "nome_completo": "JOSIMAR GOMES", "ativo": "nao", "cpf": "252.146.988-28"
    },
    {
        "id": 138, "nome_abreviado": "JULIA MARCHIORI", "nome_completo": "JULIA DE FREITAS MARCHIORI", "ativo": "nao", "cpf": "43.610.671-1"
    },
    {
        "id": 139, "nome_abreviado": "JULIA MARCHIORI", "nome_completo": "JULIA DE FREITAS MARCHIORI", "ativo": "nao", "cpf": "385.497.108-73"
    },
    {
        "id": 140, "nome_abreviado": "JULIA LOPES", "nome_completo": "JULIA MENDES LOPES", "ativo": "nao", "cpf": "431.719.348-50"
    },
    {
        "id": 141, "nome_abreviado": "JULIANA SACCHI", "nome_completo": "JULIANA BAYER SACCHI", "ativo": "nao", "cpf": "434.034.608-00"
    },
    {
        "id": 142, "nome_abreviado": "JULIANA CUMPIAN", "nome_completo": "JULIANA CUMPIAN", "ativo": "nao", "cpf": "406.521.368-18"
    },
    {
        "id": 143, "nome_abreviado": "JULIANA MAIA", "nome_completo": "JULIANA LANDOLFI MAIA", "ativo": "nao", "cpf": "054.235.799-29"
    },
    {
        "id": 144, "nome_abreviado": "KARA ARIZA", "nome_completo": "KARA BUENO DE ARAÚJO ARIZA", "ativo": "nao", "cpf": "413.393.578-01"
    },
    {
        "id": 145, "nome_abreviado": "LARISSA ROCHA", "nome_completo": "LARISSA MACHADO CAVALHERI ROCHA", "ativo": "nao", "cpf": "405.896.618-17"
    },
    {
        "id": 146, "nome_abreviado": "LARISSA OLIVEIRA", "nome_completo": "LARISSA MARTINS DE OLIVEIRA", "ativo": "nao", "cpf": "449.308.978-40"
    },
    {
        "id": 147, "nome_abreviado": "LAURA BERTAZOLLI", "nome_completo": "LAURA FRATA BERTAZOLLI", "ativo": "nao", "cpf": "442.714.668-67"
    },
    {
        "id": 148, "nome_abreviado": "LEONARDO CAETANO", "nome_completo": "LEONARDO DENIS CAETANO", "ativo": "nao", "cpf": "043.376.019-29"
    },
    {
        "id": 149, "nome_abreviado": "LEONARDO LIMA", "nome_completo": "LEONARDO LONA RIBEIRO LIMA", "ativo": "nao", "cpf": "272.639.438-83"
    },
    {
        "id": 150, "nome_abreviado": "LEONARDO MILANI", "nome_completo": "LEONARDO SANCHEZ MILANI", "ativo": "sim", "cpf": "224.590.238-63", "celular": "19992537272", "vencimento_aso": "2026-06-04", "vencimento_contrato": "2026-04-19"
    },
    {
        "id": 151, "nome_abreviado": "LETHICIA SARAIVA", "nome_completo": "LETHICIA SACRAMENTO SARAIVA", "ativo": "nao", "cpf": "232.343.418-77", "celular": "11932152402"
    },
    {
        "id": 152, "nome_abreviado": "LETICIA GONÇALVES", "nome_completo": "LETICIA MACEDO GONÇALVES", "ativo": "nao", "cpf": "470.155.898-26"
    },
    {
        "id": 153, "nome_abreviado": "LETICIA NORDER", "nome_completo": "LETICIA MAURER NORDER", "ativo": "nao", "cpf": "351.471.548-33"
    },
    {
        "id": 154, "nome_abreviado": "LETÍCIA PIMENTEL", "nome_completo": "LETÍCIA PIMENTEL", "ativo": "nao", "cpf": "482.958.328-24"
    },
    {
        "id": 155, "nome_abreviado": "LETÍCIA SOUZA", "nome_completo": "LETÍCIA XAVIER DE SOUZA", "ativo": "nao", "cpf": "476.577.298-56"
    },
    {
        "id": 156, "nome_abreviado": "LÍGIA ROCHA", "nome_completo": "LÍGIA AMBROSIO DA ROCHA", "ativo": "nao", "cpf": "498.805.068-80"
    },
    {
        "id": 157, "nome_abreviado": "LUCA PRATTA", "nome_completo": "LUCA VIANNA PRATTA", "ativo": "nao", "cpf": "437.954.788-47"
    },
    {
        "id": 158, "nome_abreviado": "LUCAS YOSHIMURA", "nome_completo": "LUCAS AKIRA YOSHIMURA", "ativo": "nao", "cpf": "413.468.138-33"
    },
    {
        "id": 159, "nome_abreviado": "LUCAS ROCHA", "nome_completo": "LUCAS AMBROSIO DA ROCHA", "ativo": "nao", "cpf": "469.669.918-80"
    },
    {
        "id": 160, "nome_abreviado": "LUCAS SALLES", "nome_completo": "LUCAS BARBOSA DE OLIVEIRA FERREIRA SALLES", "ativo": "sim", "cpf": "078.398.496-01", "celular": "19981039902", "vencimento_aso": "2026-03-30", "vencimento_contrato": "2030-01-28"
    },
    {
        "id": 161, "nome_abreviado": "LUCAS FREITAS", "nome_completo": "LUCAS GERALDI FREITAS", "ativo": "nao", "cpf": "492.522.438-79"
    },
    {
        "id": 162, "nome_abreviado": "LUCIANO", "nome_completo": "LUCIANO JUNQUEIRA FERRAZ", "ativo": "nao", "cpf": "363.164.198-21"
    },
    {
        "id": 163, "nome_abreviado": "LUÍS JÚNIOR", "nome_completo": "LUÍS ROBERTO MARQUES JÚNIOR", "ativo": "sim", "cpf": "433.904.408-36", "celular": "19993705744"
    },
    {
        "id": 164, "nome_abreviado": "LUIZ ANDIA", "nome_completo": "LUIZ ANTONIO ANDIA", "ativo": "nao", "cpf": "410.716.808-54"
    },
    {
        "id": 165, "nome_abreviado": "LUIZ SOUZA", "nome_completo": "LUIZ EDUARDO PALAZZI DE SOUZA", "ativo": "nao", "cpf": "438.799.518-10"
    },
    {
        "id": 166, "nome_abreviado": "LUIZ ROSÁRIO", "nome_completo": "LUIZ FELYPE SILVA BERTHO DO ROSÁRIO", "ativo": "nao", "cpf": "373.166.948-07"
    },
    {
        "id": 167, "nome_abreviado": "LUIZA ROCHA", "nome_completo": "LUIZA AMBROSIO DA ROCHA", "ativo": "sim", "cpf": "418.595.918-41", "celular": "11992761543"
    },
    {
        "id": 168, "nome_abreviado": "LUIZA BARROS", "nome_completo": "LUIZA LOTUFO DE BARROS", "ativo": "sim", "cpf": "398.491.628-05", "celular": "11999172882"
    },
    {
        "id": 169, "nome_abreviado": "LUIZA SEIXAS", "nome_completo": "LUIZA RIBEIRO SEIXAS", "ativo": "nao", "cpf": "406.613.098.43"
    },
    {
        "id": 170, "nome_abreviado": "LUNA AYRES", "nome_completo": "LUNA FLORIANO AYRES", "ativo": "nao", "cpf": "368.460.218-33"
    },
    {
        "id": 171, "nome_abreviado": "MAGALI RAMIREZ", "nome_completo": "MAGALI RAMIREZ", "ativo": "nao", "cpf": "858.688.688-20"
    },
    {
        "id": 172, "nome_abreviado": "MARCEL (MOTORISTA)", "nome_completo": "MARCEL ADRIANO MONTANARI (MOTORISTA)", "ativo": "nao", "cpf": "9"
    },
    {
        "id": 173, "nome_abreviado": "MARCELA LIMA", "nome_completo": "MARCELA FERNANDES FLEURY DE SOUZA LIMA", "ativo": "nao", "cpf": "430.955.648-56"
    },
    {
        "id": 174, "nome_abreviado": "MARCELLA BUENO", "nome_completo": "MARCELLA DE CAMPOS BUENO", "ativo": "nao", "cpf": "340.607.708-09"
    },
    {
        "id": 175, "nome_abreviado": "MARCELO EIRA", "nome_completo": "MARCELO AUGUSTO DA EIRA", "ativo": "nao", "cpf": "168.816.968-76", "celular": "11991422470"
    },
    {
        "id": 176, "nome_abreviado": "MARCELO BRAIT", "nome_completo": "MARCELO BRAIT", "ativo": "nao", "cpf": "10"
    },
    {
        "id": 177, "nome_abreviado": "MARCELO DUARTE", "nome_completo": "MARCELO NOGUEIRA DUARTE", "ativo": "nao", "cpf": "414.509.978-80"
    },
    {
        "id": 178, "nome_abreviado": "MARCELO MATSUGUMA", "nome_completo": "MARCELO POSSARI MATSUGUMA", "ativo": "nao", "cpf": "418.832.918-10"
    },
    {
        "id": 179, "nome_abreviado": "MARCOS OLIVEIRA", "nome_completo": "MARCOS ANTONIO GARCIA DE OLIVEIRA", "ativo": "nao", "cpf": "303.500.528-16"
    },
    {
        "id": 180, "nome_abreviado": "MARCUS FIRMINO", "nome_completo": "MARCUS VINICIUS BENEDETTI FIRMINO", "ativo": "nao", "cpf": "387.032.668-93"
    },
    {
        "id": 181, "nome_abreviado": "MARIA HIRAI", "nome_completo": "MARIA FERNANDA FERREIRA COZZO HIRAI", "ativo": "nao", "cpf": "368.444.068-00"
    },
    {
        "id": 182, "nome_abreviado": "MARIA MARIN", "nome_completo": "MARIA FERNANDA MARIN", "ativo": "nao", "cpf": "303.375.608-54"
    },
    {
        "id": 183, "nome_abreviado": "MARIA FRANKE", "nome_completo": "MARIA PAULA SANTOS FRANKE", "ativo": "nao", "cpf": "385.374.588-13"
    },
    {
        "id": 184, "nome_abreviado": "MARIA RAVARA", "nome_completo": "MARIA VICTÓRIA CARDOZO RAVARA", "ativo": "nao", "cpf": "465.853.078-36"
    },
    {
        "id": 185, "nome_abreviado": "MARIANA MARTINS", "nome_completo": "MARIANA RODRIGUES MARTINS", "ativo": "sim", "cpf": "498.528.638-94", "celular": "11984679908"
    },
    {
        "id": 186, "nome_abreviado": "MARIANA ROBATTINI", "nome_completo": "MARIANA TAURISANO ROBATTINI", "ativo": "nao", "cpf": "342.154.328-39"
    },
    {
        "id": 187, "nome_abreviado": "MARIANE FONSECA", "nome_completo": "MARIANE GABRIELLE DA FONSECA", "ativo": "nao", "cpf": "397.762.768-65"
    },
    {
        "id": 188, "nome_abreviado": "MARINA CARVALHO", "nome_completo": "MARINA DOS SANTOS CARVALHO", "ativo": "nao", "cpf": "470.271.668-95"
    },
    {
        "id": 189, "nome_abreviado": "MATEUS MARTINS", "nome_completo": "MATEUS CAYRES MARTINS", "ativo": "nao", "cpf": "218.761.788-25"
    },
    {
        "id": 190, "nome_abreviado": "MATEUS COSTA", "nome_completo": "MATEUS HENRIQUE MOREIRA CA COSTA", "ativo": "nao", "cpf": "107.633.296-6"
    },
    {
        "id": 191, "nome_abreviado": "MATHEUS SANTOS", "nome_completo": "MATHEUS BROLEZZI SANTOS", "ativo": "nao", "cpf": "440.350.948.70"
    },
    {
        "id": 192, "nome_abreviado": "MATHEUS SELINGRIN", "nome_completo": "MATHEUS BUENO SELINGRIN", "ativo": "nao", "cpf": "464.638.548-16"
    },
    {
        "id": 193, "nome_abreviado": "MATHEUS", "nome_completo": "MATHEUS GALDINO DE SOUZA", "ativo": "nao", "cpf": "434.452.578.76"
    },
    {
        "id": 194, "nome_abreviado": "MATHEUS CUNHA", "nome_completo": "MATHEUS NAKAHASUI CUNHA", "ativo": "nao", "cpf": "391.132.198-80"
    },
    {
        "id": 195, "nome_abreviado": "MAURICIO SANTOS", "nome_completo": "MAURICIO FERNANDO BISPO DOS SANTOS", "ativo": "nao", "cpf": "515.055.568-13"
    },
    {
        "id": 196, "nome_abreviado": "MAURÍCIO BIAZIN", "nome_completo": "MAURÍCIO RODRIGUES BIAZIN", "ativo": "nao", "cpf": "345.143.408-39"
    },
    {
        "id": 197, "nome_abreviado": "MAYARA FELIPE", "nome_completo": "MAYARA ALVES FELIPE", "ativo": "nao", "cpf": "542.200.008-01", "celular": "19987319656"
    },
    {
        "id": 198, "nome_abreviado": "MICHELE FERREIRA", "nome_completo": "MICHELE PERES FERREIRA", "ativo": "nao", "cpf": "11"
    },
    {
        "id": 199, "nome_abreviado": "NADIA MODA", "nome_completo": "NADIA MALENA MODA", "ativo": "sim", "cpf": "441.803.778-02"
    },
    {
        "id": 200, "nome_abreviado": "NATALIA BARONI", "nome_completo": "NATALIA BARONI", "ativo": "nao", "cpf": "360.380.888-65"
    },
    {
        "id": 201, "nome_abreviado": "NATÁLIA VIEIRA", "nome_completo": "NATÁLIA GARCIA VIEIRA", "ativo": "nao", "cpf": "400.864.010-58"
    },
    {
        "id": 202, "nome_abreviado": "NATHALE LIMA", "nome_completo": "NATHALE QUEIROZ DE OLIVEIRA LIMA", "ativo": "sim", "cpf": "444.034.748-70", "celular": "11953733325"
    },
    {
        "id": 203, "nome_abreviado": "NATHÁLIA VIEIRA", "nome_completo": "NATHÁLIA BATISTA VIEIRA", "ativo": "nao", "cpf": "053.574.021-24"
    },
    {
        "id": 204, "nome_abreviado": "NAYUKI HARA", "nome_completo": "NAYUKI PEREIRA HARA", "ativo": "nao", "cpf": "354.814.748-83"
    },
    {
        "id": 205, "nome_abreviado": "PABLO ANGELES", "nome_completo": "PABLO JENNER PAREDEZ ANGELES", "ativo": "nao", "cpf": "227.534.558-21"
    },
    {
        "id": 206, "nome_abreviado": "PAMELA", "nome_completo": "PAMELA MENEZES FARIA", "ativo": "nao", "cpf": "446155368/01"
    },
    {
        "id": 207, "nome_abreviado": "PATRICIA GIGLIO", "nome_completo": "PATRICIA DE MEO GIGLIO", "ativo": "nao", "cpf": "256.280.198-95"
    },
    {
        "id": 208, "nome_abreviado": "PATRICIA GANZELLA", "nome_completo": "PATRICIA MARIN GANZELLA", "ativo": "nao", "cpf": "445.820.018-66"
    },
    {
        "id": 209, "nome_abreviado": "PAULA VIEIRA", "nome_completo": "PAULA DANIELE VIEIRA", "ativo": "nao", "cpf": "110.482.246-60"
    },
    {
        "id": 210, "nome_abreviado": "PAULA SUEYOSHI", "nome_completo": "PAULA SUEYOSHI", "ativo": "nao", "cpf": "383.187.038-12"
    },
    {
        "id": 211, "nome_abreviado": "PEDRO BURATO", "nome_completo": "PEDRO BURATO", "ativo": "nao", "cpf": "341.702.638-82"
    },
    {
        "id": 212, "nome_abreviado": "PEDRO FALCÃO", "nome_completo": "PEDRO FALCÃO", "ativo": "nao", "cpf": "326.897.978-52"
    },
    {
        "id": 213, "nome_abreviado": "PEDRO SOARES", "nome_completo": "PEDRO FONSECA DE ALMEIDA SOARES", "ativo": "nao", "cpf": "366.527.078-29"
    },
    {
        "id": 214, "nome_abreviado": "PEDRO MOREIRA", "nome_completo": "PEDRO GUEDES MOREIRA", "ativo": "nao", "cpf": "336.943.188-28"
    },
    {
        "id": 215, "nome_abreviado": "PEDRO LOPES", "nome_completo": "PEDRO HENRIQUE MENDES LOPES", "ativo": "nao", "cpf": "368.251.288-84"
    },
    {
        "id": 216, "nome_abreviado": "PEDRO LAURINO", "nome_completo": "PEDRO NASCIMENTO LAURINO", "ativo": "nao", "cpf": "397.395.258-22"
    },
    {
        "id": 217, "nome_abreviado": "PEDRO CABRINI", "nome_completo": "PEDRO PIMENTEL CABRINI", "ativo": "nao", "cpf": "498.080.928-61"
    },
    {
        "id": 218, "nome_abreviado": "PRISCILLA CHRISPIM", "nome_completo": "PRISCILLA CHRISPIM", "ativo": "nao", "cpf": "355.254.028-82"
    },
    {
        "id": 219, "nome_abreviado": "RAFAEL DENTINI", "nome_completo": "RAFAEL DE OLIVEIRA DENTINI", "ativo": "sim", "cpf": "325.696.558-05", "celular": "19993468558"
    },
    {
        "id": 220, "nome_abreviado": "RAFAEL SANTOS", "nome_completo": "RAFAEL FELIPE DOS SANTOS", "ativo": "nao", "cpf": "003.436.931.78"
    },
    {
        "id": 221, "nome_abreviado": "RAFAEL OLIVEIRA", "nome_completo": "RAFAEL FRANÇA OLIVEIRA", "ativo": "nao", "cpf": "368.541.508-50"
    },
    {
        "id": 222, "nome_abreviado": "RAFAEL SANTOS", "nome_completo": "RAFAEL GOMES DOS SANTOS", "ativo": "nao", "cpf": "12"
    },
    {
        "id": 223, "nome_abreviado": "RAFAEL PIZANI", "nome_completo": "RAFAEL STEIN PIZANI", "ativo": "nao", "cpf": "339.153.028-64"
    },
    {
        "id": 224, "nome_abreviado": "RAQUEL LISBOA", "nome_completo": "RAQUEL MARIANA LISBOA", "ativo": "nao", "cpf": "403.810.428-12"
    },
    {
        "id": 225, "nome_abreviado": "RAQUEL GUIJO", "nome_completo": "RAQUEL PALMER GUIJO", "ativo": "nao", "cpf": "236.295.868-05"
    },
    {
        "id": 226, "nome_abreviado": "REGIANY SANTOS", "nome_completo": "REGIANY VALÉRIA DO SANTOS", "ativo": "nao", "cpf": "348.081.828-58"
    },
    {
        "id": 227, "nome_abreviado": "REGINALDO JUNIOR", "nome_completo": "REGINALDO MARINHO DA SILVA JUNIOR", "ativo": "nao", "cpf": "373.166.948-07"
    },
    {
        "id": 228, "nome_abreviado": "RENE ZANINI", "nome_completo": "RENE EDUARDO ZANINI", "ativo": "nao", "cpf": "19 98107-6107"
    },
    {
        "id": 229, "nome_abreviado": "RICARDO OKABATAKE", "nome_completo": "RICARDO YUGI OKABATAKE", "ativo": "sim", "cpf": "250.224.108-18", "celular": "19981110433", "vencimento_aso": "2026-10-28"
    },
    {
        "id": 230, "nome_abreviado": "RODOLFO ARGENTIN", "nome_completo": "RODOLFO ARGENTIN", "ativo": "nao", "cpf": "363.262.188-88"
    },
    {
        "id": 231, "nome_abreviado": "RODOLFO PUGLIESE", "nome_completo": "RODOLFO LOPES PUGLIESE", "ativo": "nao", "cpf": "485.267.438-80"
    },
    {
        "id": 232, "nome_abreviado": "RODRIGO GUSHIKEM", "nome_completo": "RODRIGO HARUO GUSHIKEM", "ativo": "nao", "cpf": "13"
    },
    {
        "id": 233, "nome_abreviado": "ROGERIO MUZINATTI", "nome_completo": "ROGERIO ANTONELI MUZINATTI", "ativo": "nao", "cpf": "14"
    },
    {
        "id": 234, "nome_abreviado": "ROGERIO ARANDA", "nome_completo": "ROGERIO DE OLIVEIRA ARANDA", "ativo": "nao", "cpf": "217.639.288-45"
    },
    {
        "id": 235, "nome_abreviado": "ROGÉRIO LOEBLEIN", "nome_completo": "ROGÉRIO HENRIQUE LOEBLEIN", "ativo": "sim", "cpf": "360.616.538-24", "celular": "19996126260"
    },
    {
        "id": 236, "nome_abreviado": "RONALDO SILVEIRA", "nome_completo": "RONALDO FRANCO DA SILVEIRA", "ativo": "nao", "cpf": "348.691.098-16"
    },
    {
        "id": 237, "nome_abreviado": "ROSANE GODOI", "nome_completo": "ROSANE CAMILA DE GODOI", "ativo": "sim", "cpf": "377.711.378-65", "celular": "19993164833", "vencimento_aso": "2026-10-23", "vencimento_contrato": "2026-01-20"
    },
    {
        "id": 238, "nome_abreviado": "SABRINA SENA", "nome_completo": "SABRINA SAVANI SENA", "ativo": "nao", "cpf": "449.266.548-06"
    },
    {
        "id": 239, "nome_abreviado": "SABRINA BUENO", "nome_completo": "SABRINA SOUZA BUENO", "ativo": "nao", "cpf": "565.686.668-82"
    },
    {
        "id": 240, "nome_abreviado": "SAMUEL OLIVEIRA", "nome_completo": "SAMUEL PALMA DE OLIVEIRA", "ativo": "nao", "cpf": "330.524.148-95"
    },
    {
        "id": 241, "nome_abreviado": "SARA CELISTRINO", "nome_completo": "SARA STEFANI CELISTRINO", "ativo": "nao", "cpf": "416.256.518-05"
    },
    {
        "id": 242, "nome_abreviado": "SHEILA CARVALHO", "nome_completo": "SHEILA LUCIANA DE CARVALHO", "ativo": "nao", "cpf": "323.363.998-81"
    },
    {
        "id": 243, "nome_abreviado": "SILAS AMORIM", "nome_completo": "SILAS DE AMORIM", "ativo": "nao", "cpf": "4887163"
    },
    {
        "id": 244, "nome_abreviado": "SILMARA FREITAS", "nome_completo": "SILMARA PUKER DE FREITAS", "ativo": "nao", "cpf": "30591417-0"
    },
    {
        "id": 245, "nome_abreviado": "SILNEI GOMES", "nome_completo": "SILNEI GOMES", "ativo": "nao", "cpf": "119.413.398-32"
    },
    {
        "id": 246, "nome_abreviado": "SILVIA ANDREO", "nome_completo": "SILVIA ANDREO", "ativo": "sim", "cpf": "210.472.158-02", "celular": "19981426054", "vencimento_aso": "2026-06-04", "vencimento_contrato": "2030-01-28"
    },
    {
        "id": 247, "nome_abreviado": "TACIÉLE SACCOL", "nome_completo": "TACIÉLE INEU SACCOL", "ativo": "nao", "cpf": "2091927125"
    },
    {
        "id": 248, "nome_abreviado": "TADEU MOREIRA", "nome_completo": "TADEU GUEDES MOREIRA", "ativo": "nao", "cpf": "337.391.338-13"
    },
    {
        "id": 249, "nome_abreviado": "TARCISIO MUNIZ", "nome_completo": "TARCISIO TOLEDO MUNIZ", "ativo": "nao", "cpf": "164154152"
    },
    {
        "id": 250, "nome_abreviado": "TATIANA DENTINI", "nome_completo": "TATIANA DE OLIVEIRA DENTINI", "ativo": "sim", "cpf": "460.995.198-31", "celular": "19999202345", "vencimento_aso": "2026-09-01"
    },
    {
        "id": 251, "nome_abreviado": "TATIANE MILANI", "nome_completo": "TATIANE ROSA RIBEIRO MILANI", "ativo": "sim", "cpf": "307.295.798-32"
    },
    {
        "id": 252, "nome_abreviado": "THALES PAIVA", "nome_completo": "THALES PAIVA DE PAIVA", "ativo": "nao", "cpf": "368.986.268-09"
    },
    {
        "id": 253, "nome_abreviado": "THIAGO SILVA", "nome_completo": "THIAGO ALVES DA SILVA", "ativo": "nao", "cpf": "366.811.588-54"
    },
    {
        "id": 254, "nome_abreviado": "THIAGO LINDOSO", "nome_completo": "THIAGO COSTA LINDOSO", "ativo": "nao", "cpf": "457.658.088-40"
    },
    {
        "id": 255, "nome_abreviado": "THIAGO COSTA", "nome_completo": "THIAGO DE MARCO COSTA", "ativo": "nao", "cpf": "416.074.808.24"
    },
    {
        "id": 256, "nome_abreviado": "THIAGO MIELLE", "nome_completo": "THIAGO MIELLE", "ativo": "nao", "cpf": "219.095.848-27"
    },
    {
        "id": 257, "nome_abreviado": "TIAGO BARBOZA", "nome_completo": "TIAGO CRISTIANO REGIS BARBOZA", "ativo": "nao", "cpf": "964.123.480-34"
    },
    {
        "id": 258, "nome_abreviado": "TIAGO AGUIAR", "nome_completo": "TIAGO HENRIQUE AGUIAR", "ativo": "nao", "cpf": "347.059.428-76"
    },
    {
        "id": 259, "nome_abreviado": "VANESSA COSTA", "nome_completo": "VANESSA FERREIRA COSTA", "ativo": "nao", "cpf": "433.214.518-67"
    },
    {
        "id": 260, "nome_abreviado": "VICTOR FARIA", "nome_completo": "VICTOR HENRIQUE DE FARIA", "ativo": "nao", "cpf": "432.824.128-19"
    },
    {
        "id": 261, "nome_abreviado": "VICTÓRIA FERNANDES", "nome_completo": "VICTÓRIA LIOTI FERNANDES", "ativo": "nao", "cpf": "414.588.278-44"
    },
    {
        "id": 262, "nome_abreviado": "VINICIUS AMSTALDEN", "nome_completo": "VINICIUS OTAVIO AMSTALDEN", "ativo": "sim", "cpf": "369.130.968-28"
    },
    {
        "id": 263, "nome_abreviado": "VITOR", "nome_completo": "VITOR D. FREIRE", "ativo": "nao", "cpf": "424.052.818-64"
    },
    {
        "id": 264, "nome_abreviado": "VITOR NARDI", "nome_completo": "VITOR TOLEDO PIZA NARDI", "ativo": "nao", "cpf": "19991727881"
    },
    {
        "id": 265, "nome_abreviado": "VITORIA MASGRAU", "nome_completo": "VITORIA RAMIREZ MASGRAU", "ativo": "nao", "cpf": "23087711861"
    },
    {
        "id": 266, "nome_abreviado": "VITORIO TORO", "nome_completo": "VITORIO FELIPE SANTOS VALENZUELA TORO", "ativo": "nao", "cpf": "41290420840"
    },
    {
        "id": 267, "nome_abreviado": "VIVIAN CARDOSO", "nome_completo": "VIVIAN DA SILVA CARDOSO", "ativo": "nao", "cpf": "310.620.948-83"
    },
    {
        "id": 268, "nome_abreviado": "WALDEMAR NETO", "nome_completo": "WALDEMAR ALVES NETO", "ativo": "nao", "cpf": "349.687.638-75"
    },
    {
        "id": 269, "nome_abreviado": "WESLEY SILVA", "nome_completo": "WESLEY DE SOUZA SILVA", "ativo": "nao", "cpf": "251.215.648-64"
    },
    {
        "id": 270, "nome_abreviado": "WILSON HIRAI", "nome_completo": "WILSON FARIA HIRAI", "ativo": "sim", "cpf": "221.569.298-74", "celular": "19991747704", "vencimento_aso": "2026-02-09", "vencimento_contrato": "2030-01-28"
    },
    {
        "id": 271, "nome_abreviado": "WINNA FANTACUSSI", "nome_completo": "WINNA ALVARENGA FANTACUSSI", "ativo": "nao", "cpf": "269.523.188-28"
    },
    {
        "id": 272, "nome_abreviado": "YURI SILVA", "nome_completo": "YURI GERMANO MUNIZ DA SILVA", "ativo": "nao", "cpf": "356.600.718-80"
    },
    {
        "id": 275, "nome_abreviado": "ANA THEREZA", "nome_completo": "ANA THEREZA", "ativo": "nao", "cpf": "1212121212"
    },
    {
        "id": 276, "nome_abreviado": "GABRIEL UBERABA", "nome_completo": "GABRIEL UBERABA", "ativo": "nao", "cpf": "1313131313"
    },
    {
        "id": 277, "nome_abreviado": "EDUARDO MOURÃO", "nome_completo": "EDUARDO MOURÃO", "ativo": "sim", "cpf": "525682648-45", "celular": "19992545901"
    },
    {
        "id": 278, "nome_abreviado": "CARLOS GARCIA", "nome_completo": "CARLOS DANIEL RANGEL GARCIA", "ativo": "sim", "cpf": "24430812810"
    },
    {
        "id": 279, "nome_abreviado": "SAMANTA PINTO", "nome_completo": "SAMANTA PINTO", "ativo": "sim", "cpf": "187.091.268-30"
    },
    {
        "id": 280, "nome_abreviado": "MELYSSA JESUS", "nome_completo": "MELYSSA ESTEVAM JANUÁRIO DE JESUS", "ativo": "sim", "cpf": "424.215.248-57", "celular": "11934092079"
    },
    {
        "id": 281, "nome_abreviado": "THIAGO ZUMACH", "nome_completo": "THIAGO ZUMACH", "ativo": "sim", "cpf": "041.867.699-23"
    },
    {
        "id": 282, "nome_abreviado": "SIRVÃO ANDREO", "nome_completo": "SIRVÃO ANDREO", "ativo": "sim", "cpf": "90990909000"
    },
    {
        "id": 283, "nome_abreviado": "ANA MCAUCHAR", "nome_completo": "Ana Luiza Rocha Mcauchar", "ativo": "sim", "cpf": "084.481.126-28", "celular": "(21) 97230-2525"
    },
    {
        "id": 284, "nome_abreviado": "NAIARA SILVA", "nome_completo": "NAIARA LAÍS FAVARIM DA SILVA", "ativo": "sim", "cpf": "395.413.428-41", "celular": "67993039374"
    },
    {
        "id": 285, "nome_abreviado": "THIAGO SILVEIRA", "nome_completo": "THIAGO DA SILVEIRA", "ativo": "sim", "cpf": "224.035.088-10", "celular": "(19) 99905-0819"
    }
];

async function run() {
  console.log("Iniciando importação de staffs com Firebase Client SDK...");
  
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash("admin", salt);

  const colRef = collection(db, "staffs");
  
  // Limpar dados existentes primeiro
  const snapshot = await getDocs(colRef);
  console.log(`Limpando ${snapshot.docs.length} staffs existentes...`);
  
  let batch = writeBatch(db);
  let deleteCounter = 0;
  for (const sDoc of snapshot.docs) {
    batch.delete(sDoc.ref);
    deleteCounter++;
    if (deleteCounter % 400 === 0) {
      await batch.commit();
      batch = writeBatch(db);
    }
  }
  if (deleteCounter % 400 !== 0) {
    await batch.commit();
  }
  console.log("Limpeza de staffs concluída.");

  // Importar novos dados em lotes (Firestore writeBatch limite é de 500)
  let currentBatch = writeBatch(db);
  let counter = 0;

  for (const staff of staffs) {
    const docId = String(staff.id);
    const docRef = doc(db, "staffs", docId);
    
    // Normalize data fields
    let dataToSet: any = {
      ativo: staff.ativo || "nao",
      nome_completo: staff.nome_completo,
      nome_abreviado: staff.nome_abreviado,
      rg: staff.rg || "",
      cpf: staff.cpf,
      dt_nascimento: staff.dt_nascimento || null,
      celular: staff.celular || "",
      endereco: staff.endereco || "",
      email: staff.email || "",
      dt_entrada: staff.dt_entrada || null,
      forma_pagamento: staff.forma_pagamento || "",
      banco: staff.banco || "",
      agencia: staff.agencia || "",
      conta: staff.conta || "",
      tipo_conta: staff.tipo_conta || "",
      vencimento_aso: staff.vencimento_aso || null,
      integracao_embraer: staff.integracao_embraer || null,
      vencimento_contrato: staff.vencimento_contrato || null,
      observacoes: staff.observacoes || "",
      createdAt: new Date().toISOString()
    };

    if (staff.id === 270) {
      dataToSet = {
        ...dataToSet,
        role: "admin",
        nivel: "admin",
        nivel_acesso: "admin",
        perfil_id: "admin",
        excecoes_acesso: { all: "write" },
        customPermissions: { all: "write" },
        senha: hash,
        email: "northbrasil@northbrasil.com.br"
      };

      // Ensure Wilson is created in users collection too
      // const userRef = doc(db, "users", "270");
      // currentBatch.set(userRef, {
      //   id: "270",
      //   userId: "270",
      //   cpf: "22156929874",
      //   name: "WILSON HIRAI",
      //   email: "logistica@northbrasil.com.br",
      //   role: "admin",
      //   nivel: "admin",
      //   nivel_acesso: "admin",
      //   permissions: ["all"],
      //   customPermissions: { all: "write" }
      // }, { merge: true });
    }

    currentBatch.set(docRef, dataToSet);
    counter++;

    if (counter % 200 === 0) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
    }
  }

  if (counter % 200 !== 0) {
    await currentBatch.commit();
  }

  console.log(`Importação de ${counter} staffs concluída com sucesso!`);

  // Tenta criar Wilson nas coleções adicionais de forma isolada
  try {
    console.log("Tentando criar Wilson Hirai na coleção 'users'...");
    const userRef = doc(db, "users", "270");
    await setDoc(userRef, {
      id: "270",
      userId: "270",
      cpf: "22156929874",
      name: "WILSON HIRAI",
      email: "logistica@northbrasil.com.br",
      role: "admin",
      nivel: "admin",
      nivel_acesso: "admin",
      permissions: ["all"],
      customPermissions: { all: "write" }
    }, { merge: true });
    console.log("Wilson Hirai configurado com sucesso na coleção 'users'!");
  } catch (userErr: any) {
    console.warn("Aviso: Não foi possível atualizar a coleção 'users' de forma isolada:", userErr.message);
  }

  process.exit(0);
}

run().catch(err => {
  console.error("Erro na importaçao:", err);
  process.exit(1);
});
