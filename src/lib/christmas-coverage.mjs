const CHRISTMAS_REVIEW_TERMS = [
            'barraza','chorrillo','calle 24','calle 25','san pedro','ciudad radial','villa del rey',
            'rana de oro','san joaquin','nazareno','villa cecilia','villa lobos','monterico sector 7',
            'monterico 7','cabuya','cabuyita','las mananitas sector 1','las mananitas sector 2','las mananitas sector 5',
            'felipillo','garzas de pacora','las garzas','el martillo','samaria','mano de piedra','torrijos carter',
            'santa marta','cerro batea','lago de los andes','coco solito','fatima','loma del cristo',
            'nuevo veranillo','veranillo','santa cruz','santa rita','caminos de omar','santa librada',
            'alcalde diaz','el trebol','nueva esperanza','jorge illueca','santa eduviges',
            'rio abajo calle 4','rio abajo calle 6','rio abajo calle 11','rio abajo calle 17'
        ];
const normalizeChristmasPlace = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const christmasRouteDistanceKm = (a,b) => {
            if (!a || !b) return null;
            const R=6371, rad=Math.PI/180;
            const dLat=(b.lat-a.lat)*rad, dLng=(b.lng-a.lng)*rad;
            const x=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
            return 2*R*Math.asin(Math.sqrt(x));
        };
function evaluateChristmasCoverage(lat,lng,label=''){
            const text=normalizeChristmasPlace(label);
            const special=CHRISTMAS_REVIEW_TERMS.some(term=>text.includes(term));
            if(special) return {status:'review',charge:0,label:'Ubicación especial · confirmar',reason:'security'};
            if(Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && (Number(lat)<8.94 || Number(lat)>9.185 || Number(lng)<-79.61 || Number(lng)>-79.275)) return {status:'review',charge:0,label:'Fuera de cobertura automática',reason:'outside'};

            const includedGroups = [
                {terms:['tocumen'],label:'Panamá Este · hasta Tocumen'},
                {terms:['villa zaita'],label:'Panamá Norte · hasta Villa Zaita'},
                {terms:['bella vista'],label:'Panamá Centro · hasta Bella Vista'},
                {terms:['chanis','villa lucre','el ingenio','san francisco','parque lefevre','pueblo nuevo','betania','bethania','obarrio','marbella','paitilla','carrasquilla','juan diaz','don bosco','el crisol','concepcion','panama viejo','las acacias'],label:'Ciudad de Panamá · transporte incluido'}
            ];
            const surchargeGroups = [
                {terms:['costa del este'],label:'Costa del Este · transporte adicional'},
                {terms:['punta pacifica'],label:'Punta Pacífica · transporte adicional'},
                {terms:['albrook','clayton','ciudad del saber'],label:'Albrook / Clayton · transporte adicional'},
                {terms:['pacora','24 de diciembre'],label:'Panamá Este · extensión hasta Pacora'},
                {terms:['la cabima'],label:'Panamá Norte · extensión hasta La Cabima'}
            ];
            for(const group of surchargeGroups) if(group.terms.some(x=>text.includes(x))) return {status:'surcharge',charge:5,label:group.label};
            for(const group of includedGroups) if(group.terms.some(x=>text.includes(x))) return {status:'included',charge:0,label:group.label};

            const la=Number(lat), lo=Number(lng);
            if(!Number.isFinite(la)||!Number.isFinite(lo)) return {status:'review',charge:0,label:'Ubicación por confirmar',reason:'no-gps'};

            // Geocercas específicas para recargos dentro de la ciudad. Se evalúan antes
            // del polígono general para que el GPS no convierta Costa del Este o Punta Pacífica en $0
            // cuando el geocodificador devuelve solamente "Juan Díaz" o "San Francisco".
            const here={lat:la,lng:lo};
            const puntaPacificaKm=christmasRouteDistanceKm(here,{lat:8.97644,lng:-79.50794});
            const costaDelEsteKm=christmasRouteDistanceKm(here,{lat:9.01318,lng:-79.46807});
            if(Number.isFinite(puntaPacificaKm) && puntaPacificaKm<=1.35) return {status:'surcharge',charge:5,label:'Punta Pacífica · transporte adicional'};
            if(Number.isFinite(costaDelEsteKm) && costaDelEsteKm<=1.9) return {status:'surcharge',charge:5,label:'Costa del Este · transporte adicional'};

            // Geocercas operativas aproximadas; sirven como respaldo cuando el geocodificador
            // devuelve un nombre poco específico. Los nombres reconocidos arriba tienen prioridad.
            const core = la>=8.94 && la<=9.125 && lo>=-79.545 && lo<=-79.365;   // Bella Vista -> Tocumen / Villa Zaita
            const west = la>=8.94 && la<=9.075 && lo>=-79.605 && lo<-79.545;   // hasta Albrook/Clayton
            const east = la>=8.95 && la<=9.145 && lo>-79.365 && lo<=-79.275;   // Tocumen -> Pacora
            const north = la>9.125 && la<=9.185 && lo>=-79.61 && lo<=-79.47;   // Villa Zaita -> La Cabima
            if(core) return {status:'included',charge:0,label:'Ciudad de Panamá · transporte incluido'};
            if(west) return {status:'surcharge',charge:5,label:'Albrook / Clayton · transporte adicional'};
            if(east) return {status:'surcharge',charge:5,label:'Panamá Este · extensión hasta Pacora'};
            if(north) return {status:'surcharge',charge:5,label:'Panamá Norte · extensión hasta La Cabima'};
            return {status:'review',charge:0,label:'Fuera de cobertura automática',reason:'outside'};
        }
export {evaluateChristmasCoverage};
