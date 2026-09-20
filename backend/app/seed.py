from .db import Base, engine, SessionLocal
from .models import Infrastructure
Base.metadata.create_all(bind=engine)

items = [
    ("Dharali Bridge","Bridge",30.67,78.49,0.95),
    ("Valley Road A","Road",30.68,78.50,0.90),
    ("Mountain Village","Village",30.69,78.51,0.85),
    ("Community Hospital","Hospital",30.70,78.52,1.00),
    ("Govt School","School",30.69,78.52,0.55),
    ("Spring Network","Water",30.68,78.52,0.80),
    ("Micro Hydro","Power",30.69,78.50,0.75),
    ("Tower Relay","Comms",30.70,78.50,0.65),
]
db = SessionLocal()
if db.query(Infrastructure).count() == 0:
    for name, kind, lat, lon, c in items:
        db.add(Infrastructure(name=name, kind=kind, latitude=lat, longitude=lon, criticality=c))
    db.commit()
    print("Seeded infrastructure.")
else:
    print("Infrastructure already seeded.")
db.close()
