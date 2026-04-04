--
-- PostgreSQL database dump
--

\restrict G52paVUQO3H3ei0nHpp4zPoHHFRdmHfgL3I21pH7AxYYQp9pzkzh2hEMRUP42Fk

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, role, last_name, first_name, patronymic, phone, avatar_url, created_at) FROM stdin;
1	director.demo@school.local	$2b$10$4q6BsbQ.2Oe4lrU6yqErLO3TKNMujYDaYGTGLxhUbrqs2HRPvh6V.	director	Петров	Александр	Николаевич	\N	\N	2026-04-03 14:04:24.280768+03
2	teacher.rus@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Соколова	Виктория	Павловна	\N	\N	2026-04-03 14:04:24.283162+03
3	teacher.math@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Лебедева	Алёна	Михайловна	\N	\N	2026-04-03 14:04:24.288663+03
4	teacher.pool.2@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Зайцева	Елена	Станиславовна	\N	\N	2026-04-03 14:04:24.29064+03
5	teacher.pool.3@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Морозова	Ольга	Вадимовна	\N	\N	2026-04-03 14:04:24.291973+03
6	teacher.pool.4@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Новикова	Марина	Евгеньевна	\N	\N	2026-04-03 14:04:24.293382+03
7	teacher.pool.5@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Волкова	Ирина	Родионовна	\N	\N	2026-04-03 14:04:24.295485+03
8	teacher.pool.6@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Орлова	Кристина	Артёмовна	\N	\N	2026-04-03 14:04:24.297523+03
9	teacher.pool.7@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Григорьева	София	Игоревна	\N	\N	2026-04-03 14:04:24.300028+03
10	teacher.pool.8@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Попова	Ульяна	Фёдоровна	\N	\N	2026-04-03 14:04:24.30249+03
11	teacher.pool.9@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Соколова	Вероника	Тимофеевна	\N	\N	2026-04-03 14:04:24.304042+03
12	teacher.pool.10@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Киселёва	Дарья	Романовна	\N	\N	2026-04-03 14:04:24.306812+03
13	teacher.pool.11@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Беляева	Арина	Вячеславовна	\N	\N	2026-04-03 14:04:24.308652+03
14	teacher.pool.12@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Романова	Пелагея	Зиновьевна	\N	\N	2026-04-03 14:04:24.309964+03
15	teacher.pool.13@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Матвеева	Элина	Богдановна	\N	\N	2026-04-03 14:04:24.311274+03
16	teacher.pool.14@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Захарова	Лидия	Семёновна	\N	\N	2026-04-03 14:04:24.312727+03
17	teacher.pool.15@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Быкова	Милана	Никитична	\N	\N	2026-04-03 14:04:24.314894+03
18	teacher.pool.16@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Ермакова	Арина	Вадимовна	\N	\N	2026-04-03 14:04:24.318058+03
19	teacher.pool.17@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Симонова	Кира	Егоровна	\N	\N	2026-04-03 14:04:24.320052+03
20	teacher.pool.18@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Антонова	Эмилия	Савельевна	\N	\N	2026-04-03 14:04:24.321277+03
21	teacher.pool.19@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Комарова	Аглая	Филаретовна	\N	\N	2026-04-03 14:04:24.32285+03
22	teacher.pool.20@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Гаврилова	Нонна	Капитоновна	\N	\N	2026-04-03 14:04:24.324579+03
23	teacher.pool.21@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Наумова	Фаина	Макаровна	\N	\N	2026-04-03 14:04:24.326259+03
24	teacher.pool.22@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Данилова	Злата	Платоновна	\N	\N	2026-04-03 14:04:24.327782+03
25	teacher.pool.23@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Шестакова	Ариадна	Всеволодовна	\N	\N	2026-04-03 14:04:24.329199+03
26	teacher.pool.24@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Миронова	Лариса	Яковлевна	\N	\N	2026-04-03 14:04:24.331001+03
27	teacher.pool.25@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Титова	Эсфирь	Марковна	\N	\N	2026-04-03 14:04:24.333353+03
28	teacher.pool.26@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Осипова	Клавдия	Давыдовна	\N	\N	2026-04-03 14:04:24.335673+03
29	teacher.pool.27@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Полякова	Раиса	Корниловна	\N	\N	2026-04-03 14:04:24.337268+03
30	teacher.pool.28@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Жукова	Тамара	Афанасьевна	\N	\N	2026-04-03 14:04:24.339624+03
31	teacher.pool.29@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Блинова	Любовь	Степановна	\N	\N	2026-04-03 14:04:24.341891+03
32	teacher.pool.30@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Рябова	Галина	Леонтьевна	\N	\N	2026-04-03 14:04:24.343193+03
33	teacher.pool.31@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Кудрявцева	Нина	Геннадьевна	\N	\N	2026-04-03 14:04:24.344465+03
34	teacher.pool.32@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Агафонова	Таисия	Петровна	\N	\N	2026-04-03 14:04:24.346327+03
35	teacher.pool.33@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Малева	Ева	Станиславовна	\N	\N	2026-04-03 14:04:24.349359+03
36	teacher.pool.34@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Севостьянова	Динара	Ильинична	\N	\N	2026-04-03 14:04:24.351727+03
37	teacher.pool.35@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Ларионова	Белла	Артемовна	\N	\N	2026-04-03 14:04:24.353462+03
38	teacher.pool.36@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Пастухова	Регина	Осиповна	\N	\N	2026-04-03 14:04:24.354783+03
39	teacher.pool.37@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Уварова	Мира	Вениаминовна	\N	\N	2026-04-03 14:04:24.356606+03
40	teacher.pool.38@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Щербакова	Лия	Ефимовна	\N	\N	2026-04-03 14:04:24.358719+03
41	teacher.pool.39@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Воробьёва	Зоя	Матвеевна	\N	\N	2026-04-03 14:04:24.360298+03
42	teacher.pool.40@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Герасимова	Ида	Романовна	\N	\N	2026-04-03 14:04:24.362374+03
43	teacher.pool.41@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Давыдова	Роза	Глебовна	\N	\N	2026-04-03 14:04:24.367268+03
44	teacher.pool.42@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Ефремова	Ника	Емельяновна	\N	\N	2026-04-03 14:04:24.368923+03
45	teacher.pool.43@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Зимина	Лия	Саввична	\N	\N	2026-04-03 14:04:24.370424+03
46	teacher.pool.44@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Калашникова	Влада	Пантелеевна	\N	\N	2026-04-03 14:04:24.373251+03
47	teacher.pool.45@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Лискова	Милица	Тимофеевна	\N	\N	2026-04-03 14:04:24.374778+03
48	teacher.pool.46@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Мельникова	Снежана	Оскаровна	\N	\N	2026-04-03 14:04:24.376735+03
49	teacher.pool.47@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Назарова	Ярослава	Семёновна	\N	\N	2026-04-03 14:04:24.3783+03
50	teacher.pool.48@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Овчинникова	Лада	Вадимовна	\N	\N	2026-04-03 14:04:24.379554+03
51	teacher.pool.49@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Пирогова	Кира	Ефремовна	\N	\N	2026-04-03 14:04:24.382581+03
52	teacher.pool.50@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Родионова	Аида	Зиновьевна	\N	\N	2026-04-03 14:04:24.385678+03
53	teacher.pool.51@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Савицкая	Этель	Богдановна	\N	\N	2026-04-03 14:04:24.387664+03
54	teacher.pool.52@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Терехова	Лада	Капитоновна	\N	\N	2026-04-03 14:04:24.390345+03
55	teacher.pool.53@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Устинова	Мира	Фёдоровна	\N	\N	2026-04-03 14:04:24.393286+03
56	teacher.pool.54@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Фадеева	Нонна	Яковлевна	\N	\N	2026-04-03 14:04:24.394668+03
57	teacher.pool.55@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Хохлова	Злата	Всеволодовна	\N	\N	2026-04-03 14:04:24.396515+03
58	teacher.pool.56@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Чистякова	Элина	Платоновна	\N	\N	2026-04-03 14:04:24.399785+03
59	teacher.pool.57@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Шадрина	Динара	Никитична	\N	\N	2026-04-03 14:04:24.401467+03
60	teacher.pool.58@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Яковлева	Ариадна	Артёмовна	\N	\N	2026-04-03 14:04:24.403239+03
61	teacher.pool.59@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Белов	Аркадий	Петрович	\N	\N	2026-04-03 14:04:24.405284+03
62	teacher.pool.60@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Воронин	Ефим	Степанович	\N	\N	2026-04-03 14:04:24.406995+03
63	teacher.pool.61@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Гаврилов	Зенон	Леонтьевич	\N	\N	2026-04-03 14:04:24.408185+03
64	teacher.pool.62@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Демидов	Игнатий	Матвеевич	\N	\N	2026-04-03 14:04:24.409654+03
65	teacher.pool.63@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Ермолаев	Капитон	Романович	\N	\N	2026-04-03 14:04:24.410759+03
66	teacher.pool.64@school.local	$2b$10$PyopfE/2arxdUtl2.nO79exo3joLBs2qB0yasWYWFEDafruoIp7OS	teacher	Жуков	Иннокентий	Саввич	\N	\N	2026-04-03 14:04:24.412132+03
67	andreeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Андреева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
68	belov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Белов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
69	varenikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Вареникова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
70	vinogradov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Виноградов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
71	vikhreva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Вихрева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
72	gusarova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Гусарова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
73	drozdova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Дроздова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
74	zaytseva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Зайцева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
75	ivanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Иванова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
76	kudryavtseva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кудрявцева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
77	kyusyu.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кюсю	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
78	lastochkina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ласточкина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
79	ovchinnikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Овчинникова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
80	peskova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пескова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
81	savitskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Савицкая	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
82	sokolova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Соколова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
83	tokio.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Токио	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
84	chaykina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Чайкина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
85	yasuo.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ясуо	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
86	besputova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Беспутова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
87	blinova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Блинова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
88	vorkutova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Воркутова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
89	voronov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Воронов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
90	grigorev.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Григорьев	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
91	kioto.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Киото	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
92	kotletova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Котлетова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
93	ladoga.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ладога	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
94	liskova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лискова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
95	midori.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Мидори	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
96	mironova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Миронова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
97	popova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Попова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
98	sedova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Седова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
99	selivanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Селиванова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
100	soloveva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Соловьёва	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
101	tokhoku.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Тохоку	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
102	fadeeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Фадеева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
103	fedorov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Федоров	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
104	schukina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Щукина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
105	vavilova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Вавилова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
106	dvinskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Двинская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
107	maleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Малева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
108	melnikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Мельникова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
109	osaka.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Осака	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
110	pelmenova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пельменова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
111	ryabova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Рябова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
112	smirnova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Смирнова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
113	ushakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ушакова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
114	yudina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Юдина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
115	bortnikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Бортникова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
116	zhukova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Жукова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
117	zimina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Зимина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
118	kalashnikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Калашникова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
119	orlov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Орлов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
120	pirozhkova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пирожкова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
121	ryabinina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Рябинина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
122	ryabtseva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Рябцева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
123	sinitsyna.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Синицына	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
124	khibiki.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Хибики	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
125	shapovalova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Шаповалова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
126	akay.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Акай	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
127	vasileva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Васильева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
128	gusinaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Гусиная	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
129	efremova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ефремова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
130	zhuravleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Журавлёва	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
131	zykova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Зыкова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
132	kudesnikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кудесникова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
133	kuzminova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кузьминова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
134	pestova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пестова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
135	petrova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Петрова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
136	polyakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Полякова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
137	sakura.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сакура	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
138	sidorov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сидоров	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
139	tantsorova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Танцорова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
140	tyugoku.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Тюгоку	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
141	filatova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Филатова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
142	chernova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Чернова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
143	bogdanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Богданова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
144	glazunova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Глазунова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
145	dolmatova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Долматова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
146	egorova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Егорова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
147	efanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ефанова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
148	zinoveva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Зиновьева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
149	kenzhi.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кенжи	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
150	kovaleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ковалёва	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
151	mikheeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Михеева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
152	nagoya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Нагоя	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
153	nazarova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Назарова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
154	ozerova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Озерова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
155	rodionova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Родионова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
156	sevostyanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Севостьянова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
157	sikoku.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сикоку	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
158	simonova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Симонова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
159	syrozhkin.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сырожкин	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
160	titova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Титова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
161	shiryaeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ширяева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
162	vorobeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Воробьёва	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
163	vyazemskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Вяземская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
164	danilova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Данилова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
165	degtyareva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Дегтярёва	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
166	kansay.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кансай	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
167	kozlova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Козлова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
168	koroleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Королева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
169	ladozhskiy.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ладожский	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
170	makarov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Макаров	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
171	morozova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Морозова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
172	pestretsova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пестрецова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
173	semenova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Семёнова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
174	sinsyu.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Синсю	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
175	smetannaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сметанная	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
176	sova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
177	uspenskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Успенская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
178	khokkaydo.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Хоккайдо	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
179	shadrina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Шадрина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
180	yamagata.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ямагата	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
181	yartseva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ярцева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
182	savitskiy.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Савицкий	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
183	akasi.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Акаси	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
184	klimova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Климова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
185	lisova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лисова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
186	maleev.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Малеев	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
187	novikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Новикова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
188	tverskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Тверская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
189	utrobina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Утробина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
190	antonova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Антонова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
191	blinovskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Блиновская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
192	gavrilova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Гаврилова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
193	demidova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Демидова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
194	zaychenko.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Зайченко	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
195	iokogama.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Иокогама	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
196	lebyazhiy.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лебяжий	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
197	okinava.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Окинава	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
198	pastukhova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пастухова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
199	pakhomova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пахомова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
200	reznikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Резникова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
201	ryu.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Рю	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
202	ryabchinova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Рябчинова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
203	stepanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Степанова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
204	tvorozhnova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Творожнова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
205	terekhova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Терехова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
206	vavilonova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Вавилонова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
207	gavrilovna.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Гавриловна	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
208	glukhova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Глухова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
209	zakharova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Захарова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
210	zorkina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Зорькина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
211	kotova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Котова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
212	lapina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лапина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
213	lebedeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лебедева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
214	matsumoto.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Мацумото	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
215	mescheryakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Мещерякова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
216	naumova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Наумова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
217	oladieva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Оладиева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
218	sapporo.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Саппоро	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
219	tanaka.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Танака	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
220	timofeeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Тимофеева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
221	chistyakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Чистякова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
222	scherbakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Щербакова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
223	gladkova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Гладкова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
224	gusinyy.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Гусиный	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
225	efimova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ефимова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
226	ilina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ильина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
227	kagosima.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кагосима	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
228	kobe.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кобе	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
229	komarova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Комарова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
230	lisovskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лисовская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
231	maslyanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Маслянова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
232	nikolaeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Николаева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
233	pavlova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Павлова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
234	pevitsa.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Певица	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
235	sato.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сато	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
236	seliverstova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Селиверстова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
237	trofimova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Трофимова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
238	uvarova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Уварова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
239	ustinova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Устинова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
240	arkhipov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Архипов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
241	ptitsyna.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Птицына	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
242	romanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Романова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
243	saveleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Савельева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
244	siro.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сиро	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
245	ulanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Уланова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
246	tsaplina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Цаплина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
247	golikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Голикова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
248	golubeva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Голубева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
249	dmitriev.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Дмитриев	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
250	ermakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ермакова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
251	kuznetsov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Кузнецов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
252	larionova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ларионова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
253	rzhevskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Ржевская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
254	smetannikov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сметанников	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
255	takesi.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Такеси	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
256	bespalova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Беспалова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
257	zhdanova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Жданова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
258	nakha.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Наха	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
259	sinitsyn.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Синицын	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
260	strelkova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Стрелкова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
261	tantsovschitsa.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Танцовщица	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
262	khokhlova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Хохлова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
263	mednikov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Мёдников	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
264	agafonova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Агафонова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
265	babkina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Бабкина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
266	blinchikova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Блинчикова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
267	dolgova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Долгова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
268	permyakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пермякова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
269	pirogova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Пирогова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
270	tantsovschik.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Танцовщик	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
271	fukuoka.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Фукуока	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
272	shishova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Шишова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
273	oladev.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Оладьев	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
274	berezutskiy.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Березуцкий	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
275	borisov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Борисов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
276	vladimirov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Владимиров	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
277	volkov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Волков	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
278	orlovskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Орловская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
279	osipova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Осипова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
280	tverskoy.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Тверской	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
281	khokuriku.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Хокурику	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
282	shmeleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Шмелёва	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
283	ptitsyn.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Птицын	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
284	bykova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Быкова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
285	vorobushkina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Воробушкина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
286	malysheva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Малышева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
287	mamontova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Мамонтова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
288	pevets.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Певец	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
289	khirosi.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Хироси	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
290	gerasimova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Герасимова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
291	gorbunova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Горбунова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
292	kiseleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Киселёва	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
293	lebedyanskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лебедянская	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
294	medovaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Медовая	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
295	sorokina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Сорокина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
296	tokay.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Токай	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
297	frolova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Фролова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
298	shestakova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Шестакова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
299	scheglova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Щеглова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
300	aomori.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Аомори	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
301	berezutskaya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Березуцкая	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
302	besprova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Беспрова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
303	gromov.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Громов	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
304	nikiforova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Никифорова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
305	utkina.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Уткина	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
306	yakovleva.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Яковлева	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
307	davydova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Давыдова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
308	lebyazhya.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Лебяжья	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
309	martynova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Мартынова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
310	pevtsova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Певцова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
311	khlopova.parent@school.local	$2b$10$CXQjt0ym9A/L.CDUf3olGeaE2gB5t.k37qbenm25wahP7wu7mKz5a	parent	Хлопова	Родитель		\N	\N	2026-04-03 14:04:24.493605+03
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 311, true);


--
-- PostgreSQL database dump complete
--

\unrestrict G52paVUQO3H3ei0nHpp4zPoHHFRdmHfgL3I21pH7AxYYQp9pzkzh2hEMRUP42Fk

