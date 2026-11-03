use serde::de::DeserializeOwned;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};
use tauri::{
    ipc::{CallbackFn, InvokeBody},
    test::{get_ipc_response, MockRuntime, INVOKE_KEY},
    webview::InvokeRequest,
    WebviewWindow,
};

static COUNTER: AtomicU64 = AtomicU64::new(0);

pub struct TempWorkspace {
    pub root: PathBuf,
}

impl TempWorkspace {
    pub fn new() -> Self {
        let id = COUNTER.fetch_add(1, Ordering::Relaxed);
        let root = std::env::temp_dir().join(format!("marnote-ipc-{}-{id}", std::process::id()));
        if root.exists() {
            fs::remove_dir_all(&root).unwrap();
        }
        fs::create_dir_all(&root).unwrap();
        Self { root }
    }
}

impl Drop for TempWorkspace {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.root);
    }
}

pub fn invoke<T: DeserializeOwned>(
    window: &WebviewWindow<MockRuntime>,
    command: &str,
    args: serde_json::Value,
) -> Result<T, String> {
    let request = InvokeRequest {
        cmd: command.to_owned(),
        callback: CallbackFn(0),
        error: CallbackFn(1),
        url: "tauri://localhost".parse().unwrap(),
        body: InvokeBody::Json(args),
        headers: Default::default(),
        invoke_key: INVOKE_KEY.to_owned(),
    };
    get_ipc_response(window, request)
        .map_err(|error| error.to_string())?
        .deserialize::<T>()
        .map_err(|error| error.to_string())
}
