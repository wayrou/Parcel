use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;



#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub name: String,
    #[serde(rename = "createdAt")]
    pub created_at: u64,
    #[serde(rename = "updatedAt")]
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub body: String,
    pub folder_id: Option<String>,
    pub pinned: bool,
    pub color: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParcelData {
    pub version: u32,
    pub notes: Vec<Note>,
    pub folders: Vec<Folder>,
}

fn data_file(app_data_dir: PathBuf) -> PathBuf {
    app_data_dir.join("parcel").join("notes.json")
}

pub fn load(app_data_dir: PathBuf) -> anyhow::Result<ParcelData> {
    let path = data_file(app_data_dir);
    
    // Check if file exists
    if !path.exists() {
        // Return empty data structure for first run
        return Ok(ParcelData {
            version: 1,
            notes: Vec::new(),
            folders: Vec::new(),
        });
    }
    
    let s = fs::read_to_string(&path)?;
    
    // Try to parse JSON, with better error handling
    let mut data: ParcelData = serde_json::from_str(&s)
        .map_err(|e| anyhow::anyhow!("Failed to parse JSON: {}. File may be corrupt.", e))?;
    
    // Validate data structure
    validate_data(&data)?;
    
    // Migrate data to current version if needed
    data = migrate_data(data)?;
    
    // Re-validate after migration
    validate_data(&data)?;
    
    Ok(data)
}

fn validate_data(data: &ParcelData) -> anyhow::Result<()> {
    // Validate version
    if data.version == 0 || data.version > 10 {
        return Err(anyhow::anyhow!("Invalid data version: {}. Expected 1-10.", data.version));
    }
    
    // Validate notes
    for (idx, note) in data.notes.iter().enumerate() {
        if note.id.is_empty() {
            return Err(anyhow::anyhow!("Note at index {} has empty ID", idx));
        }
        // Validate color
        let valid_colors = ["paper", "yellow", "mint", "lavender", "salmon", "sky"];
        if !valid_colors.contains(&note.color.as_str()) {
            // Auto-fix invalid colors
            // This will be handled in migration, but we log it here
        }
    }
    
    // Validate folders
    for (idx, folder) in data.folders.iter().enumerate() {
        if folder.id.is_empty() {
            return Err(anyhow::anyhow!("Folder at index {} has empty ID", idx));
        }
        if folder.name.trim().is_empty() {
            return Err(anyhow::anyhow!("Folder at index {} has empty name", idx));
        }
    }
    
    Ok(())
}

fn migrate_data(mut data: ParcelData) -> anyhow::Result<ParcelData> {
    const CURRENT_VERSION: u32 = 1;
    
    // If already at current version, just fix any invalid data
    if data.version >= CURRENT_VERSION {
        // Fix invalid colors
        let valid_colors = ["paper", "yellow", "mint", "lavender", "salmon", "sky"];
        for note in &mut data.notes {
            if !valid_colors.contains(&note.color.as_str()) {
                note.color = "paper".to_string();
            }
        }
        return Ok(data);
    }
    
    // Migration logic for future versions
    // Example: if data.version == 0, migrate to version 1
    // For now, version 1 is the initial version, so no migration needed
    
    // Fix invalid colors during migration
    let valid_colors = ["paper", "yellow", "mint", "lavender", "salmon", "sky"];
    for note in &mut data.notes {
        if !valid_colors.contains(&note.color.as_str()) {
            note.color = "paper".to_string();
        }
    }
    
    // Update version to current
    data.version = CURRENT_VERSION;
    
    Ok(data)
}

pub fn save(app_data_dir: PathBuf, data: &ParcelData) -> anyhow::Result<()> {
    let path = data_file(app_data_dir);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let s = serde_json::to_string_pretty(data)?;
    fs::write(path, s)?;
    Ok(())
}

// Export data to JSON string
pub fn export_json(data: &ParcelData) -> anyhow::Result<String> {
    Ok(serde_json::to_string_pretty(data)?)
}

// Export data to Markdown format
pub fn export_markdown(data: &ParcelData) -> anyhow::Result<String> {
    use std::fmt::Write;
    
    let mut output = String::new();
    writeln!(output, "# Parcel Notes Export\n")?;
    writeln!(output, "*Total notes: {}*", data.notes.len())?;
    writeln!(output, "*Total folders: {}*\n", data.folders.len())?;
    
    // Group notes by folder
    let mut notes_by_folder: std::collections::HashMap<Option<String>, Vec<&Note>> = std::collections::HashMap::new();
    for note in &data.notes {
        notes_by_folder.entry(note.folder_id.clone()).or_insert_with(Vec::new).push(note);
    }
    
    // Export notes in folders
    for folder in &data.folders {
        writeln!(output, "## Folder: {}\n", folder.name)?;
        
        if let Some(notes) = notes_by_folder.get(&Some(folder.id.clone())) {
            for note in notes {
                writeln!(output, "### {}\n", if note.title.is_empty() { "Untitled" } else { &note.title })?;
                if !note.body.is_empty() {
                    writeln!(output, "{}\n", note.body)?;
                }
                writeln!(output, "*Color: {} | Pinned: {}*\n", note.color, note.pinned)?;
            }
        }
    }
    
    // Export notes without folders
    if let Some(notes) = notes_by_folder.get(&None) {
        writeln!(output, "## Notes (No Folder)\n")?;
        for note in notes {
            writeln!(output, "### {}\n", if note.title.is_empty() { "Untitled" } else { &note.title })?;
            if !note.body.is_empty() {
                writeln!(output, "{}\n", note.body)?;
            }
            writeln!(output, "*Color: {} | Pinned: {}*\n", note.color, note.pinned)?;
        }
    }
    
    Ok(output)
}
