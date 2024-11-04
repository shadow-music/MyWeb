package main

import (
    "database/sql"
    "html/template"
    "log"
    "net/http"
    _ "github.com/mattn/go-sqlite3"
)

type Artist struct {
    ID       int
    Name     string
    Bio      string
    ImageURL string
}

type Song struct {
    ID            int
    Title         string
    Lyrics        string
    ArtistName    string
    AlbumCoverURL string
}

var tmpl = template.Must(template.ParseFiles("templates/index.html"))

func main() {
    db, err := sql.Open("sqlite3", "./music.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        artists, songs, err := getHomeData(db)
        if err != nil {
            http.Error(w, "Server error", http.StatusInternalServerError)
            return
        }
        tmpl.Execute(w, map[string]interface{}{
            "Artists": artists,
            "Songs":   songs,
        })
    })

    http.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.Dir("css"))))
    http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("assets"))))
    log.Println("Server started at :8080")
    http.ListenAndServe(":8080", nil)
}

func getHomeData(db *sql.DB) ([]Artist, []Song, error) {
    artists := []Artist{}
    songs := []Song{}

    // Query for artists
    rows, err := db.Query("SELECT id, name, bio, image_url FROM artists")
    if err != nil {
        return nil, nil, err
    }
    defer rows.Close()
    for rows.Next() {
        var artist Artist
        rows.Scan(&artist.ID, &artist.Name, &artist.Bio, &artist.ImageURL)
        artists = append(artists, artist)
    }

    // Query for songs
    rows, err = db.Query(`
        SELECT songs.id, songs.title, songs.lyrics, songs.album_cover_url, artists.name 
        FROM songs 
        JOIN artists ON songs.artist_id = artists.id
    `)
    if err != nil {
        return nil, nil, err
    }
    defer rows.Close()
    for rows.Next() {
        var song Song
        rows.Scan(&song.ID, &song.Title, &song.Lyrics, &song.AlbumCoverURL, &song.ArtistName)
        songs = append(songs, song)
    }

    return artists, songs, nil
}
