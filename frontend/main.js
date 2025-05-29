
document.getElementById('myButton').addEventListener('click', function() {
    alert('Hello, Sarah! Welcome to the frontend.');
    console.log('Hello, Marcus! Welcome to the backend.');
});


const UIController = (function() {
    const DOMElements = {
        buttonLogin: '#btn_login',
        buttonCheck: '#btn_check1',
        buttonSubmit: '#btn_submit',
        deltaEnergy: '#delta_energy',
        deltaValence: '#delta_valence',
        formUpload: '#upload_check',
        divRecList: '.rec-list',
        divRecDownload: '#rec-download',
        divRecDetail: '#rec-detail',

    }


    return {
        inputField(index) {
            return {
                login: document.querySelector(DOMElements.buttonLogin),
                song: document.querySelector(`#input_song${index}`),
                artist: document.querySelector(`#input_artist${index}`),
                check: document.querySelector(DOMElements.buttonCheck),
                deltaEnergy: document.querySelector(DOMElements.deltaEnergy),
                deltaValence: document.querySelector(DOMElements.deltaValence),
                file: document.querySelector('#input_file'), 
                formUpload: document.querySelector(DOMElements.formUpload),
                submit: document.querySelector(DOMElements.buttonSubmit),
                recs: document.querySelector(DOMElements.divRecList),
                recDownload: document.querySelector(DOMElements.divRecDownload), 
                recDetail: document.querySelector(DOMElements.divRecDetail)
            }
        },

        createRec(id, name) {
            const html = `<a href="#" class="list-group-item list-group-item-action list-group-item-light" id="${id}">${name}</a>`;
            document.querySelector(DOMElements.divRecList).insertAdjacentHTML('beforeend', html);
        },

        createDownload() {
            const html = '<a href="/generate-and-download/csv" class="btn btn-primary">Download CSV</a>'
            document.querySelector(DOMElements.divRecDownload).insertAdjacentHTML('beforeend', html);
        },

        createRecDetail(id) {
            const detailDiv = document.querySelector(DOMElements.divRecDetail);
            detailDiv.innerHTML = '';
            const url = `https://open.spotify.com/embed/track/${id}`;

            const html = 
            `
            <div class="row col-sm-12 px-0">
                <iframe src="${url}" width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
            </div>
            `;

            detailDiv.insertAdjacentHTML('beforeend', html)
        },

        createRecDelta(delta) {
            const detailDiv = document.querySelector(DOMElements.divRecDetail);
            
            denergy = Number(delta.energy.toFixed(2));
            dvalence = Number(delta.valence.toFixed(2));

            const html = `
                <div class="row col-sm-12 px-0">
                    <p>Difference between original avg and rec song</p>
                    <p>energy: ${denergy}, valence: ${dvalence}</p>
                </div>
            `;

            detailDiv.insertAdjacentHTML('beforeend', html);
        },


        resetRecDetail() {
            this.inputField().recDetail.innerHTML = '';
        },

        resetRecs() {
            this.inputField().recs.innerHTML = '';
            this.inputField().recDownload.innerHTML = '';
        }

    }
})();


const APPController = (function(UICtrl) {
    const DOMInputs = UICtrl.inputField();

    var deltaFeatures = {
        energy: 0.15,
        valence: 0.15
    }

    const songData1 = {
        name: '',
        id: '',
        artist: '',
        origFeatures: {},
        adjustFeatures: {},
        confirm: false
    }

    DOMInputs.login.addEventListener('click', async (event) => {
        event.preventDefault();
        console.log("tryna log rn");
        window.location.href = "/login";
    })

    //function(string, string): data
    async function checkSongArtist(songInput, artistInput) {
        var response = await fetch('/api/checkSongArtist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                song: songInput,
                artist: artistInput
            })
        })
        return response.json();
    }

    //button check valid song and artist
    DOMInputs.check.addEventListener('click', async (event) => {
        event.preventDefault();
        const songInput = UICtrl.inputField(1).song.value;
        const artistInput = UICtrl.inputField(1).artist.value;
        const data = await checkSongArtist(songInput, artistInput);

        songData1.name = data.tracks.items[0].name;
        songData1.id = data.tracks.items[0].id;
        songData1.artist = data.tracks.items[0].artists[0].name;


        const userConfirmed = confirm(`Your song is ${songData1.name} by ${songData1.artist}}. Do you want to proceed?`);
        if (userConfirmed) {
            songData1.confirm = true;
        }

    })

    //upload file ("returns" responseData in object type)
    DOMInputs.formUpload.addEventListener('click', async(e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('fileInput', UICtrl.inputField(1).file.files[0]);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('File upload failed.');

            const responseData = await response.json();
            const data = await checkSongArtist(responseData.data[0].name, responseData.data[0].artist);
            songData1.name = data.tracks.items[0].name;
            songData1.id = data.tracks.items[0].id;
            songData1.artist = data.tracks.items[0].artists[0].name;

            const userConfirmed = confirm(`Your song is ${songData1.name} by ${songData1.artist}}. Do you want to proceed?`);
            if (userConfirmed) {
                songData1.confirm = true;
            }

        } catch (error) {
            console.error(error);
        }


    })

    //helper
    async function getFeatures(songId) {
        response = await fetch('/api/getFeatures', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songId: songId
            })
        });
        return response.json();
    }

    //helper
    async function adjustFeatures(songFeatures, delta) {
        response = await fetch('/api/adjustFeatures', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                features: songFeatures,
                offset: delta
            })
        });
        return response.json(); 
    }

    //helper
    async function getRecs(songId, songFeatures) {
        response = await fetch('/api/getRecs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                songId1: songId,
                features: songFeatures
            })
        });
        return response.json();
    }

    //submit & process
    DOMInputs.submit.addEventListener('click', async (event) => {
        event.preventDefault(); // prevent form from being submitted normally
        UICtrl.resetRecs();
        UICtrl.resetRecDetail();
        
        //encapsulate these in a separate function
        if (UICtrl.inputField(1).deltaEnergy.value != ''){
            deltaFeatures.energy = parseFloat(UICtrl.inputField(1).deltaEnergy.value);
        } 
        if (UICtrl.inputField(1).deltaValence.value != ''){
            deltaFeatures.valence = parseFloat(UICtrl.inputField(1).deltaValence.value);
        } 

        if (songData1.confirm == true) {
            songData1.origFeatures = await getFeatures(songData1.id);
            songData1.adjustFeatures = await adjustFeatures(songData1.origFeatures, deltaFeatures);
            const recs = await getRecs(songData1.id, songData1.adjustFeatures);
            console.log("incoming recs");
            console.log(recs);
            recs.tracks.forEach(r => UICtrl.createRec(r.href, r.name));
            UICtrl.createDownload();
        }
    })

    //helper
    async function getRec(recEndPoint) {
        const response = await fetch('/api/getRec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recEndPoint: recEndPoint
            })
        });
        return response.json();
    }

    //helper
    async function getRecDelta(origFeatures, recFeatures) {
        const response3 = await fetch('/api/getRecDelta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                origFeatures: songData1.origFeatures, //make this smoother
                recFeatures: recFeatures
            })
        })

        return response3.json();
    }

    //click on recommended song
    DOMInputs.recs.addEventListener('click', async (e) => {
        e.preventDefault();
        UICtrl.resetRecDetail();
        const rec = await getRec(e.target.id)
        const recFeatures = await getFeatures(rec.id);
        const recDelta = await getRecDelta(songData1.origFeatures, recFeatures);

        UICtrl.createRecDetail(rec.id);
        UICtrl.createRecDelta(recDelta);

    });

    return {
        init() {
            console.log('App is starting');
        }
    }

})(UIController);

//RUN HERE
APPController.init();