// Exact swept circle against a stationary rectangle, including rounded corners.
export function sweepCircleRect(from,to,r,rect) {
  const dx=to.x-from.x,dy=to.y-from.y,candidates=[];
  const add=(t,nx,ny)=>{if(t>=0&&t<=1)candidates.push({t,nx,ny,x:from.x+dx*t,y:from.y+dy*t});};
  if(dx){
    for(const [x,nx] of [[rect.x-r,-1],[rect.x+rect.w+r,1]]){
      const t=(x-from.x)/dx,y=from.y+dy*t;
      if(dx*nx<0 && y>=rect.y&&y<=rect.y+rect.h)add(t,nx,0);
    }
  }
  if(dy){
    for(const [y,ny] of [[rect.y-r,-1],[rect.y+rect.h+r,1]]){
      const t=(y-from.y)/dy,x=from.x+dx*t;
      if(dy*ny<0 && x>=rect.x&&x<=rect.x+rect.w)add(t,0,ny);
    }
  }
  const a=dx*dx+dy*dy;
  if(a)for(const [cx,sx] of [[rect.x,-1],[rect.x+rect.w,1]])for(const [cy,sy] of [[rect.y,-1],[rect.y+rect.h,1]]){
    const ox=from.x-cx,oy=from.y-cy,b=2*(ox*dx+oy*dy),c=ox*ox+oy*oy-r*r,discriminant=b*b-4*a*c;
    if(discriminant<0)continue;
    const t=(-b-Math.sqrt(discriminant))/(2*a),x=from.x+dx*t,y=from.y+dy*t;
    if((x-cx)*sx>=0&&(y-cy)*sy>=0)add(t,(x-cx)/r,(y-cy)/r);
  }
  return candidates.sort((a,b)=>a.t-b.t)[0]||null;
}
