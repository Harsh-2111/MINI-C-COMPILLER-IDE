int choose(bool ready) {
    if (ready) {
        return 1;
    } else {
        return 0;
    }
}

int main() {
    return choose(true);
}
